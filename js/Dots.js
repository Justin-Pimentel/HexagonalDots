window.onload = function() {
    var game = new Phaser.Game(800, 600, Phaser.CANVAS, "", {preload: onPreload, create: onCreate, update: onUpdate});
    
    //Set to true if you'd like to see the underlying hex grid
    var drawableGrid = false;
    
    //You can change grid size here.
    var ROW = 10;
    var COL = 10;
    
    //You can change the number of colors here up to 8 colors
    var DOT_COLORS = 4;
    
    var graphics;
    var text;
    var pL;
    var EVEN = 1;
    var ODD = -1;
    var score = 0;
    var dotArray;
    var processArray = new Array();
    var columnsToUpdate = new Array();
    var numDotsToSpawn = new Array(COL).fill(0);
    var colors = [0xE74C3C, 0x8E44AD, 0x3498DB, 0x2ECC71, 0xF1C40F, 0x000000, 0x0000FF, 0x808000];
    var pointyLayout = Orientation(Math.sqrt(3.0), Math.sqrt(3.0)/2.0, 0.0, 3.0/2.0,                                                Math.sqrt(3.0)/3.0, -1.0/3.0, 0.0, 2.0/3.0, 0.5 );
    
    //*----------------------------------Constructors----------------------------------*
    
    function Point(x, y){
        return {x: x, y: y};
    }
    
    //Hex grid taken and modified from: www.redblobgames.com/grids/hexagons
    //Hex definition with a cube constructor and cube storage
    function Hex(q, r, s){
        if(Math.round(q + r + s) != 0){
            throw "q + r + s must equal 0";
        }
        
        return {q: q, r: r, s: s};
    }
    
    //Dot structure takes in position in offset coords and color
    function Dot(position, color, sprite){
        var cubePos = roffsetToCube(EVEN, position);
        return {position: position, color: color, cubePos: cubePos, dSprite: sprite};
    }
    
    //Controls orientation of the hexes
    function Orientation(f0, f1, f2, f3, b0, b1, b2, b3, startAngle){
        return {f0: f0, f1: f1, f2: f2, f3: f3, 
                b0: b0, b1: b1, b2: b2, b3: b3, 
                startAngle: startAngle};
    }
    
    //Defines the grid layout
    function Layout(orientation, size, origin){
        return {orientation: orientation, size: size, origin: origin};
    }
    
    //*----------------------------------Grid Functions----------------------------------*
    
    function dotEquals(a, b){
        return (a.position == b.position && a.color == b.color && HexEquals(a.cubePos, b.cubePos));
    }
    
    //Helper function to test hex equivalency
    function HexEquals(a, b){
        return (a.q == b.q && a.r == b.r && a.s == b.s);
    }
    
    function HexAdd(a, b){
        return Hex(a.q + b.q, a.r + b.r, a.s + b.s);
    }
    
    function HexSub(a, b){
        return Hex(a.q - b.q, a.r - b.r, a.s - b.s);
    }
    
    function HexLength(a){
        return (Math.abs(a.q) + Math.abs(a.r) + Math.abs(a.s)) / 2;
    }
    
    function HexDist(a, b){
        return HexLength(HexSub(a, b));
    }
    
    function hexRound(h)
    {
        var qi = Math.round(h.q);
        var ri = Math.round(h.r);
        var si = Math.round(h.s);
        var q_diff = Math.abs(qi - h.q);
        var r_diff = Math.abs(ri - h.r);
        var s_diff = Math.abs(si - h.s);
        if (q_diff > r_diff && q_diff > s_diff)
        {
            qi = -ri - si;
        }
        else
            if (r_diff > s_diff)
            {
                ri = -qi - si;
            }
            else
            {
                si = -qi - ri;
            }
        return Hex(qi, ri, si);
    }
    
    function OffsetCoord(col, row){
        return {col: col, row: row};
    }
    
    function offsetEquals(a, b){
        return (a.col == b.col && a.row == b.row);
    }
    
    //Returns an OffsetCoord object with col and row
    function roffsetFromCube(offset, h)
    {
        var col = h.q + (h.r + offset * (h.r & 1)) / 2;
        var row = h.r;
        if (offset !== EVEN && offset !== ODD)
        {
            throw "offset must be EVEN (+1) or ODD (-1)";
        }
        return OffsetCoord(col, row);
    }

    //Returns a Hex object with cube coords
    function roffsetToCube(offset, h)
    {
        var q = h.col - (h.row + offset * (h.row & 1)) / 2;
        var r = h.row;
        var s = -q - r;
        if (offset !== EVEN && offset !== ODD)
        {
            throw "offset must be EVEN (+1) or ODD (-1)";
        }
        return Hex(q, r, s);
    }
    
    //Helper function that takes a hex and returns it's center point in pixels
    function hexToPixel(layout, h){
        var M = layout.orientation;
        var size = layout.size;
        var origin = layout.origin;
        var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
        var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
        return Point(x + origin.x, y + origin.y);
    }
    
    //Takes a pixel location and returns a hex
    function pixelToHex(layout, p){
        var M = layout.orientation;
        var size = layout.size;
        var origin = layout.origin;
        var pt = Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
        var q = M.b0 * pt.x + M.b1 * pt.y;
        var r = M.b2 * pt.x + M.b3 * pt.y;
        return Hex(q, r, -q - r);
    }
    
    function hexCornerOffset(layout, corner){
        var M = layout.orientation;
        var size = layout.size;
        var angle = 2.0 * Math.PI * (M.startAngle - corner) / 6.0;
        //console.log("angle: ", angle);
        return Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
    }

    function polygonCorners(layout, h){
        var corners = [];
        var center = hexToPixel(layout, h);
        //console.log("Center: ", center);
        for (var i = 0; i < 6; i++)
        {
            var offset = hexCornerOffset(layout, i);
            //console.log("offset: ", offset);
            corners.push(Point(center.x + offset.x, center.y + offset.y));
        }
        return corners;
    }
    
    //*----------------------------------Helper Functions----------------------------------*
    
    //Draws the lines from dot to dot
    function drawConnection(fromDot, toDot){
        graphics.lineStyle(10, fromDot.dSprite.tint, 1);
        var c1 = hexToPixel(pL, fromDot.cubePos);
        var c2 = hexToPixel(pL, toDot.cubePos);
        graphics.moveTo(c1.x, c1.y);
        graphics.lineTo(c2.x, c2.y);
        graphics.endFill();
    }
    
    //Create line graphics object on click
    function onClick(){
        graphics = game.add.graphics(0,0);
    }
    
    //Destroy it on release of click
    function onRelease(){
        graphics.destroy();
    }
    
    //Helper function to draw underlying hexagons on the grid
    function drawHex(corners){
        graphics.lineStyle(1, "#000000", 1);
        for(i = 1; i < 7; i++){
            if(i != 6){
                graphics.moveTo(corners[i-1].x, corners[i-1].y);
                graphics.lineTo(corners[i].x, corners[i].y);
                graphics.endFill();
            }else{
                graphics.moveTo(corners[5].x, corners[5].y);
                graphics.lineTo(corners[0].x, corners[0].y);
                graphics.endFill();
            }
        }
    }
    
    //Draws grid and populates it with random dots
    function drawGrid(layout, height, width){
        var hex;
        var c;
        dotArray = new Array(height);
        
        for(i = 0; i < height; i++){
            dotArray[i] = new Array(width);
        }
        
        for(h = 0; h < height; h++){
            for(w = 0; w < width; w++){
                hex = OffsetCoord(w, h);
                hex = roffsetToCube(EVEN, hex);
                var center = hexToPixel(layout, hex);
                var dot = game.add.sprite(center.x, center.y, "dot");
                dot.anchor.setTo(0.5, 0.5);
                dot.tint = Phaser.ArrayUtils.getRandomItem(colors, 0, DOT_COLORS);
                dot.dotAlive = true;
                var position = new OffsetCoord(w, h);
                var newDot = new Dot(position, dot.tint, dot);
                dotArray[h][w] = newDot;
                if(drawableGrid){
                    graphics = game.add.graphics(0,0);
                    c = polygonCorners(layout, hex);
                    drawHex(c);
                }
            }
        }
    }
    
    //Returns the hex when you click on the game screen
    function getHexOnClick(){
        var mousePos = new Point(game.input.mousePointer.x, game.input.mousePointer.y);
        var h = pixelToHex(pL, mousePos);
        h = hexRound(h);
        return h;
    }
    
    //Adds dot to processArray when you hover over a new potential dot
    function addDot(refDot){
        var considered = false;
        
        //Only take valid dots in game grid that are distance 1 away from current dot and same color
        if(processArray.length > 0){
            if(HexEquals(refDot.cubePos, processArray[processArray.length-1].cubePos) || 
                HexDist(refDot.cubePos, processArray[processArray.length-1].cubePos) > 1 ||
                refDot.dSprite.tint != processArray[processArray.length-1].dSprite.tint){
                    considered = true;
            }
            
            //Check if we already have this dot in the array
            if(!considered){
                var alreadyExists = false;
                for(i = 0; i < processArray.length; i++){
                    if(dotEquals(refDot, processArray[i])){
                        alreadyExists = true;
                    }
                }
                
                //If none of the above applies then push it into array for processing
                if(!alreadyExists){
                    processArray.push(refDot);
                    drawConnection(processArray[processArray.length-2], processArray[processArray.length-1]);
                }
            }
            
        }else{
            processArray.push(refDot);
        }
    }
    
    //Stores which dot was clicked on and adds into process array
    function processDots(){
        var refHex = getHexOnClick();
        var hOffset = roffsetFromCube(EVEN, refHex);
        
        if(hOffset.row <= dotArray.length-1 && hOffset.row >= 0 &&
           hOffset.col <= dotArray[0].length-1 && hOffset.col >= 0){
            var refDot = dotArray[hOffset.row][hOffset.col];
            addDot(refDot);
        }
    }
    
    //Destroys any dots in the process array given that there are at least 2
    //then creates a new process array
    function destroyDots(){
        if(processArray.length > 1){
            for(i = 0; i < processArray.length; i++){
                text.text = "Score: " + ++score;
                var p = processArray[i].position;
                columnsToUpdate.push(p.col);
                numDotsToSpawn[p.col]++;
                dotArray[p.row][p.col].dSprite.dotAlive = false;
                dotArray[p.row][p.col].dSprite.visible = false;
            }
        }
        processArray.splice(0, processArray.length);
    }
    
    //Function defines the movement down the column when dots are falling
    function getTweenArray(coordA, coordB){
        var numSteps = coordB.row - coordA.row;
        var stepArray = new Array(2);
        stepArray[0] = new Array(numSteps);
        stepArray[1] = new Array(numSteps);
        for(i = coordA.row+1, j = 0; j < numSteps; i++, j++){
            var hex = dotArray[i][coordA.col].cubePos;
            var pixelLoc = hexToPixel(pL, hex);
            stepArray[0][j] = pixelLoc.x;
            stepArray[1][j] = pixelLoc.y;
        }
        
        return stepArray;
    }
    
    //Tweens dots to empty spots below
    function tweenDots(aboveDot, thisDot){
        var coordA = aboveDot.position;
        var coordB = thisDot.position;
        var aD = aboveDot.cubePos;
        var aP = hexToPixel(pL, aD);
        var stepArray = getTweenArray(coordA, coordB);
        var d = game.add.sprite(aP.x, aP.y, "dot");
        d.endLoc = coordB;
        d.anchor.setTo(0.5, 0.5);
        d.tint = aboveDot.dSprite.tint;
        dotArray[coordA.row][coordA.col].dSprite.visible = false;
        var tween = game.add.tween(d);
        tween.to({ x: stepArray[0], y: stepArray[1] }, 150, "Linear");
        tween.start();
        tween.onComplete.add(checkArrival, this);
    }
    
    //Once it makes it to its destination then delete the tween target
    //and set the dot to visible on grid
    function checkArrival(currentTarget, currentTween){
        var currLoc = currentTween.target.endLoc;
        dotArray[currLoc.row][currLoc.col].dSprite.visible = true;
        currentTarget.destroy();
    }
    
    //Updates the board whenever dots are deleted
    function updateBoard(){
        //Check only the columns that lost dots
        while(columnsToUpdate.length > 0){
            //Get first column from array. Goes right to left on game grid.
            var col = columnsToUpdate.pop();
            //Loop through column from the bottom up checking if there are any
            //empty spaces beneath "alive" dots.
            for(i = dotArray.length-1; i > 0; i--){
                //If it is not alive, update spot with dot above it
                //and tween it to new location
                if(!dotArray[i][col].dSprite.dotAlive){
                    //Search for nearest dot up the column
                    for(k = i; k >= 0; k--){
                        if(dotArray[k][col].dSprite.dotAlive){
                            var aboveDot = dotArray[k][col];
                            var thisDot = dotArray[i][col];
                            //Set the current dot to the dot above's color
                            dotArray[i][col].dSprite.tint = aboveDot.dSprite.tint;
                            dotArray[i][col].dSprite.dotAlive = true;
                            //Then set the one above to dead
                            dotArray[k][col].dSprite.dotAlive = false;
                            tweenDots(aboveDot, thisDot);
                            break;
                        }
                    }
                }
            }
            //Spawn dots once all updates are finished
            if(columnsToUpdate.length == 0){
                spawnDots();
            }
        }
    }
    
    //Spawns new dots and tweens them to their new location
    function spawnDots(){
        for(i = 0; i < COL; i++){
            if(numDotsToSpawn[i] > 0 && !dotArray[0][i].dSprite.dotAlive){
                numDotsToSpawn[i]--;
                var rColor = Phaser.ArrayUtils.getRandomItem(colors, 0 , DOT_COLORS);
                dotArray[0][i].dSprite.tint = rColor;
                dotArray[0][i].dSprite.dotAlive = true;
                columnsToUpdate.push(i);
                
                //Tween to new location
                var dropLoc = hexToPixel(pL, dotArray[0][i].cubePos);
                var drop = game.add.sprite(dropLoc.x, dropLoc.y-100, "dot");
                drop.anchor.setTo(0.5, 0.5);
                drop.tint = rColor;
                drop.i = i
                var tween = game.add.tween(drop);
                tween.to({ x: dropLoc.x, y: dropLoc.y }, 150, "Linear");
                tween.start();
                tween.onComplete.add(function(tweenTarget){
                    dotArray[0][tweenTarget.i].dSprite.visible = true;
                    tweenTarget.destroy();
                });
            }
        }
    }
    
    //*-----------------------------------Game Loop-----------------------------------*
    
    //Preload dot sprite
    function onPreload(){
        game.load.image("dot", "assets/basedot.png");
    }
    
    //Game setup and grid draw
    function onCreate(){
        game.stage.backgroundColor = "#ffffff";
        text = game.add.text(25, 25, "Score: ", { font: "40px Arial", fill: "#000000", align: "center" });
        pL = Layout(pointyLayout, Point(30.0, 30.0), Point(100.0, 100.0));
        drawGrid(pL, ROW, COL);
        game.input.onDown.add(onClick, this);
        game.input.onUp.add(onRelease, this);
    }
    
    //Updates game board when player makes a move
    function onUpdate(){
        if(game.input.activePointer.isDown){
            processDots();
        }else{
            destroyDots();
        }
        
        updateBoard();
    }
}