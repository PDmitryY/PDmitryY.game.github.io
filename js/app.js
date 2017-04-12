var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.height = 580;
canvas.width = 460;
document.body.appendChild(canvas);

// Make music

function playSound(src) {
    if(src){
        var audio = new Audio();
        audio.src = src;
        audio.autoplay = true;
        return audio;
    } else {
        return undefined;
    }
    
}

function stopPlaySound(sound){
    if(sound){
        sound.pause();
        sound.currentTime = 0;
    }
}

// The main game loop
var lastTime;

function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
};

function init() {
    spacePattern = ctx.createPattern(resources.get('img/space.png'), 'repeat');

    document.getElementById('play-again').addEventListener('click', function() {
        reset();
        backgroundSound = playSound('sounds/S31-200% Production.ogg');
    });

    reset();
    lastTime = Date.now();
    main();
    backgroundSound = playSound('sounds/S31-200% Production.ogg');
}

resources.load([
    'img/sprites___.png',
    'img/space.png',
    'img/asteroids.png'
]);
resources.onReady(init);

// Game state
var player = {
    pos: [0, 0],
    sprite: new Sprite('img/sprites___.png', [0, 0], [76, 74])
};

var bullets = [];
var enemies = [];
var asteroids = [];
var explosions = [];

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;
var spacePattern;

let backgroundSound;
let hotSound;
let explosionSound;
let gameOverSound;

var score = 0;
var scoreEl = document.getElementById('score');

// Speed in pixels per second
var playerSpeed = 200;
var bulletSpeed = 500;
var enemySpeed = 100;
var asteroidsSpeed = 100;

// Update game objects
function update(dt) {
    gameTime += dt;

    handleInput(dt);
    updateEntities(dt);

    // It gets harder over time by adding enemies using this
    // equation: 1-.993^gameTime
    if(Math.random() < 1 - Math.pow(.996, gameTime)) {
        enemies.push({
            pos: [
                  Math.random() * (canvas.width - 39), 0],
            sprite: new Sprite('img/sprites___.png', [80, 0], [40, 39])
        });
    }
    
    // Adding asteroids
    
    if(Math.random() < 1 - Math.pow(.9995, gameTime)) {
        asteroids.push({
            pos: [
                  Math.random() * (canvas.width - 37), 0],
            sprite: new Sprite('img/asteroids.png', [0, 0], [34, 37],
                               6, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
        });
    }

    checkCollisions();

    scoreEl.innerHTML = score;
};

function handleInput(dt) {
    if(input.isDown('DOWN') || input.isDown('s')) {
        player.pos[1] += playerSpeed * dt;
    }

    if(input.isDown('UP') || input.isDown('w')) {
        player.pos[1] -= playerSpeed * dt;
    }

    if(input.isDown('LEFT') || input.isDown('a')) {
        player.pos[0] -= playerSpeed * dt;
    }

    if(input.isDown('RIGHT') || input.isDown('d')) {
        player.pos[0] += playerSpeed * dt;
    }

    if(input.isDown('SPACE') &&
       !isGameOver &&
       Date.now() - lastFire > 100) {
        var x = player.pos[0] + player.sprite.size[0] / 2;
        var y = player.pos[1] + player.sprite.size[1] / 2;
        
        hotSound = playSound('sounds/Shoot 3.wav')

        bullets.push({ pos: [x, y],
                       dir: 'up',
                       sprite: new Sprite('img/sprites___.png', [13, 80], [13, 20]) });
        bullets.push({ pos: [x, y],
                       dir: 'forward',
                       sprite: new Sprite('img/sprites___.png', [3, 80], [7, 25]) });
        bullets.push({ pos: [x, y],
                       dir: 'backward',
                       sprite: new Sprite('img/sprites___.png', [3, 80], [7, 25]) });

        lastFire = Date.now();
    }
}

function updateEntities(dt) {
    // Update the player sprite animation
    player.sprite.update(dt);

    // Update all the bullets
    for(var i=0; i<bullets.length; i++) {
        var bullet = bullets[i];

        switch(bullet.dir) {
        case 'up': bullet.pos[1] -= bulletSpeed * dt; break;
        case 'down': bullet.pos[1] += bulletSpeed * dt; break;
        case 'backward': bullet.pos[0] -= bulletSpeed * dt; break;
        default:
            bullet.pos[0] += bulletSpeed * dt;
        }

        // Remove the bullet if it goes offscreen
        if(bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
           bullet.pos[0] > canvas.width) {
            bullets.splice(i, 1);
            i--;
        }
    }

    // Update all the enemies
    for(var i=0; i<enemies.length; i++) {
        enemies[i].pos[1] += enemySpeed * dt;
        enemies[i].sprite.update(dt);

        // Remove if offscreen
        if(enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
            enemies.splice(i, 1);
            i--;
        }
    }
    
    // Update all the asteroids
    
    for(var i=0; i<asteroids.length; i++) {
        asteroids[i].pos[1] += asteroidsSpeed * dt;
        asteroids[i].sprite.update(dt);

        // Remove if offscreen
        if(asteroids[i].pos[0] + asteroids[i].sprite.size[0] < 0) {
            asteroids.splice(i, 1);
            i--;
        }
    }
    
    // Update all the explosions
    for(var i=0; i<explosions.length; i++) {
        explosions[i].sprite.update(dt);

        // Remove if animation is done
        if(explosions[i].sprite.done) {
            explosions.splice(i, 1);
            i--;
        }
    }
}

// Collisions

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    if([pos, size, pos2, size2].every(Array.isArray)){
        return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
    } else {
        return false;
    }
}

function checkCollisions() {
    checkPlayerBounds();
    
    // Run collision detection for all enemies and bullets
    for(var i=0; i<enemies.length; i++) {
        var pos = enemies[i].pos;
        var size = enemies[i].sprite.size;

        for(var j=0; j<bullets.length; j++) {
            var pos2 = bullets[j].pos;
            var size2 = bullets[j].sprite.size;

            if(boxCollides(pos, size, pos2, size2)) {
                // Remove the enemy
                enemies.splice(i, 1);
                i--;

                // Add score
                score += 100;

                // Add an explosion
                explosions.push({
                    pos: pos,
                    sprite: new Sprite('img/sprites___.png',
                                       [0, 117],
                                       [39, 39],
                                       16,
                                       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                       null,
                                       true)
                });
                
                explosionSound = playSound('sounds/explosion.wav');

                // Remove the bullet and stop this iteration
                bullets.splice(j, 1);
                break;
            }
        }

        if(boxCollides(pos, size, player.pos, player.sprite.size)) {
            gameOver();
        }
    }
    
    // Run collision detection for all asteroids and bullets
    
    for(var i=0; i<asteroids.length; i++) {
        var pos = asteroids[i].pos;
        var size = asteroids[i].sprite.size;

        for(var j=0; j<bullets.length; j++) {
            var pos2 = bullets[j].pos;
            var size2 = bullets[j].sprite.size;

            if(boxCollides(pos, size, pos2, size2)) {
                
                // Remove the bullet
                bullets.splice(j, 1);
                j--;
                break;
            }
        }
        if(boxCollides(pos, size, player.pos, player.sprite.size)) {
            gameOver();
        }
    }
    
    // Run collision detection for all asteroids and enemies
    
    for(var i=0; i<asteroids.length; i++) {
        var pos = asteroids[i].pos;
        var size = asteroids[i].sprite.size;

        for(var j=0; j<enemies.length; j++) {
            var pos = enemies[j].pos;
            var size = enemies[j].sprite.size;

            if(boxCollides(pos, size, pos2, size2)) {
                
                // Remove the asteroid
                asteroids.splice(i, 1);
                i--;
                break;
            }
        }
    }
    
    // Run collision detection for all enemies and enemies
    
    for(var i=0; i<enemies.length; i++) {
        var pos = enemies[i].pos;
        var size = enemies[i].sprite.size;

        for(var j=0; j<enemies.length; j++) {
            var pos = enemies[j].pos;
            var size = enemies[j].sprite.size;

            if(boxCollides(pos, size, pos2, size2)) {
                
                // Remove the asteroid
                enemies.splice(j, 1);
                j--;
                break;
            }
        }
    }
    
}

function checkPlayerBounds() {
    // Check bounds
    if(player.pos[0] < 0) {
        player.pos[0] = 0;
    }
    else if(player.pos[0] > canvas.width - player.sprite.size[0]) {
        player.pos[0] = canvas.width - player.sprite.size[0];
    }

    if(player.pos[1] < 0) {
        player.pos[1] = 0;
    }
    else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
        player.pos[1] = canvas.height - player.sprite.size[1];
    }
}

// Draw everything
function render() {
    ctx.fillStyle = spacePattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render the player if the game isn't over
    if(!isGameOver) {
        renderEntity(player);
    }

    renderEntities(bullets);
    renderEntities(enemies);
    renderEntities(asteroids);
    renderEntities(explosions);
};

function renderEntities(list) {
    for(var i=0; i<list.length; i++) {
        renderEntity(list[i]);
    }    
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

// Game over
function gameOver() {
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('game-over-overlay').style.display = 'block';
    isGameOver = true;
    stopPlaySound(backgroundSound);
    //gameOverSound = playSound('sounds/At the starting line.mp3');
}

// Reset game to original state
function reset() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-over-overlay').style.display = 'none';
    isGameOver = false;
    gameTime = 0;
    score = 0;

    enemies = [];
    bullets = [];
    asteroids = [];
    
    //stopPlaySound(gameOverSound);

    player.pos = [190, 500];
};