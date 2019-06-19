// jshint esversion: 6

const CHOOSE_CHARACTER = 0;
const CHOOSE_MOVEMENT = 1;
const BUILD = 2;
const GAME_OVER = 3;
const ANIMATING = 4;
const SETTING_SCENE = 5;

let w = 5;
let h = 5;
let res = 100;

let grid;
let currentPlayer;
let players;
let state;
let floors;

let gameOver;
let winner;

let mouseWasPressed = false;

var rotationZ = -Math.PI;
var rotationX = Math.PI / 2;
let onGoingZRotation = 0;
let onGoingXRotation = 0;
var zoom = -5;
let offsetX = 0;
let offsetY = 0;
let onGoingXOffset = 0;
let onGoingYOffset = 0;

let clickedX;
let clickedY;
let selectedCell = -1;

let animationManager;

let floorMods;

let nbFloors = [22, 18, 14, 18];

function s2(p) {
  let imgPrefix = 'img/';
  let objPrefix = 'obj/';

  let planeTxt;
  let backgroundTxt;
  let nameHolderTxt;
  let firstPlayerNameTxt;
  let secondPlayerNameTxt;
  let componentsHolderTxt;
  let bottomPlaneTxt;
  let numberTextures;

  let rotationZStart = 0;
  let rotationXStart = 0;
  let offsetXStart = 0;
  let offsetYStart = 0;
  let isRotating = false;
  let isMoving = false;
  
  p.preload = function() {
    planeTxt = p.loadImage(imgPrefix+"grid.png");
    backgroundTxt = p.loadImage(imgPrefix+"background.png");
    nameHolderTxt = p.loadImage(imgPrefix+"nameHolder.png");
    bottomPlaneTxt = p.loadImage(imgPrefix+"bottomPlane.png");
    componentsHolderTxt = p.loadImage(imgPrefix+"componentsHolder.png");
    seaBlueTxt = p.loadImage(imgPrefix+"seaBlue.png");

    floorMods = [
      p.loadModel(objPrefix+"santoriniBaseFloor.obj"),
      p.loadModel(objPrefix+"santoriniSecondFloor.obj"),
      p.loadModel(objPrefix+"santoriniThirdFloor.obj"),
      p.loadModel(objPrefix+"santoriniDome.obj")
    ];

    numberTextures = [];
    for (let i = 0; i <= 22; i++) {
      numberTextures.push(createTextTexture(p, 'x ' + i, 30));
    }

    state = ANIMATING;
  }
  
  p.setup = function() {
    // Data
    grid = [];
    for (let i = 0; i < h; i++) {
      grid[i] = [];
      for (let j = 0; j < w; j++) {
        grid[i][j] = 0;
      }
    }
    
    players = [];
    players.push(new Player("Player 1", p.color(175, 225, 255)));
    players[0].addCharacterAt(1, 1);
    players[0].addCharacterAt(3, 3);

    players.push(new Player("Player 2", 225));
    players[1].addCharacterAt(1, 3);
    players[1].addCharacterAt(3, 1);
    currentPlayer = 0;

    gameOver = false;

    floors = [];

    animationManager = new AnimationManager();

    // Graphics
    let canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);

    let myP5 = p.createGraphics(0, 0);

    firstPlayerNameTxt = createTextTexture(p, players[0].name, 32);
    secondPlayerNameTxt = createTextTexture(p, players[1].name, 32);

    canvas.elt.addEventListener('mousedown', e => {
      e.preventDefault();
      return false;
    });

    canvas.elt.addEventListener('contextmenu', e => {
      e.preventDefault();
      return false;
    });

    canvas.elt.addEventListener('wheel', e => {
      e.preventDefault();
      return false;
    });

    state = SETTING_SCENE;
  }

  p.idle = function() {
    if (state === SETTING_SCENE) {
      let animation = new Animation(window, {zoom: 10, rotationX: 50 * Math.PI / 180, rotationZ: 0}, (n, t) => {
        // return 1 - (1 - n / t) ** 2;
        return cubicBezier(n / t, {x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}).y;
      }, 2000, function() {
        state = CHOOSE_CHARACTER;
      });
      animationManager.add(animation);
      state = ANIMATING;
    } else if (state === CHOOSE_CHARACTER && selectedCell !== -1) {
      let x = selectedCell % w;
      let y = Math.floor(selectedCell / w);
      let player = getCurrentPlayer();
      let n;

      if ((n = player.hasCharacterAt(x, y)) !== -1) {
        player.selectCharacter(n);
        selectedCell = -1;
        state = CHOOSE_MOVEMENT;
      }
    } else if (state === CHOOSE_MOVEMENT && selectedCell !== -1) {
      let x = selectedCell % w;
      let y = Math.floor(selectedCell / w);
      let player = getCurrentPlayer();
      let n;

      if ((n = player.hasCharacterAt(x, y)) !== -1) {
        player.unselectCharacter(n);
        selectedCell = -1;
        state = CHOOSE_CHARACTER;
        return;
      }

      let selectedCharacter = getSelectedCharacter();
      if (selectedCharacter.canAccess(x, y)) {
        selectedCell = -1;
        state = ANIMATING;
        selectedCharacter.moveTo(x, y, function() { state = BUILD });
      }
    } else if (state === BUILD && selectedCell !== -1) {
      let x = selectedCell % w;
      let y = Math.floor(selectedCell / w);
      let n;

      let selectedCharacter = getSelectedCharacter();
      
      if (nbFloors[grid[x][y]] !== 0 && selectedCharacter.isNextTo(x, y) && boxIsEmpty(x, y) && grid[x][y] < 4) {
        unselectAllCharacters();
        selectedCell = -1;
        state = ANIMATING;
        buildFloorAt(x, y);
      }
    }

    animationManager.play();
  }
  
  p.draw = function() {
    p.idle();

    p.perspective();

    resetDirectionalLights(p);
    p.ambientLight(240);

    p.background(255);

    // Draw the background
    p.push(); {
      p.translate(0, 80, zoom * 20);
      p.rotateX(3 * p.PI / 2 + rotationX + onGoingXRotation);
      p.texture(backgroundTxt);
      p.sphere(2000);
    } p.pop();

    p.translate(offsetX + onGoingXOffset, 0, zoom * 20);
    p.rotateX(rotationX + onGoingXRotation);
    p.rotateZ(rotationZ + onGoingZRotation);
    p.translate(0, offsetY + onGoingYOffset, 0);

    p.push(); {
      p.translate(0, 0, -80);
      p.texture(bottomPlaneTxt);
      p.plane(1500);
    } p.pop();

    p.directionalLight(25, 25, 25, -2, 2, -1);
    p.directionalLight(50, 50, 50, 0, 1, 0);

    // Draw the board
    p.noStroke();
    p.texture(planeTxt);
    p.plane(360);

    for (let floor of floors) {
      let m = 225;
      if (floor.model === floorMods[3]) {
        m = p.color(0, 0, 200);
      }
      floor.draw(p, m);
    }
    
    // Draw the pawns
    for (let player of players) {
      for (let character of player.characters) {
        if (character.selected) {
            let r = 0.75;
            let lRed = p.red(player.color) * r;
            let lGreen = p.green(player.color) * r;
            let lBlue = p.blue(player.color) * r;
            let darkerColor = p.color(lRed, lGreen, lBlue);

            p.ambientMaterial(darkerColor);
        } else {
          p.ambientMaterial(player.color);
        }

        character.draw(p);
      }
    }

    // Draw HUD
    p.resetMatrix();
    p.camera();
    p.ortho();

    p.resetMatrix();

    // Player's name
    p.push(); {
      p.translate(0, -p.height / 2 + nameHolderTxt.height / 4);
      p.texture(nameHolderTxt);
      p.plane(nameHolderTxt.width / 2, nameHolderTxt.height / 2);
    } p.pop();

    p.push(); {
      p.translate(0, -p.height / 2 + firstPlayerNameTxt.height / 2 + 23);
      if (currentPlayer === 0) {
        p.texture(firstPlayerNameTxt);
      } else {
        p.texture(secondPlayerNameTxt);
      }
      p.plane(firstPlayerNameTxt.width, firstPlayerNameTxt.height);
    } p.pop();

    // Floors left
    p.push(); {
      p.translate(0, p.height / 2 - 75, -150);

      for (let i = 0; i < floorMods.length; i++) {
        p.push(); {
          p.translate(-300 + 200 * i, 0, 0);

          p.texture(componentsHolderTxt);
          p.plane(146, 157);

          p.translate(0, 0, 50);
          p.push(); {
            p.rotateX(p.PI * 5 / 6);
            p.rotateY(p.PI / 4);
            p.ambientMaterial(i !== 3 ? 225 : p.color(0, 0, 200));
            p.model(floorMods[i]);
          } p.pop();

          let t = numberTextures[nbFloors[i]];
          p.translate(0, 50, 0);
          p.texture(t);
          p.plane(t.width, t.height);
          t.remove();
        } p.pop();
      }
    } p.pop();
  }
  
  p.mousePressed = function() {
    if (state === SETTING_SCENE) return;

    if (p.mouseX >= 0 && p.mouseX < p.width && p.mouseY >= 0 && p.mouseY < p.height) {
      if (p.mouseButton === p.RIGHT) {
        rotationZStart = p.mouseX;
        rotationXStart = p.mouseY;
        isRotating = true;
      } else if (p.mouseButton === p.CENTER) {
        offsetXStart = p.mouseX;
        offsetYStart = p.mouseY;
        isMoving = true;
      }
    }
  }
  
  p.mouseDragged = function() {
    if (state === SETTING_SCENE) return;

    if (isRotating) {
      onGoingZRotation = -(p.mouseX - rotationZStart) / 100;
      onGoingXRotation = -(p.mouseY - rotationXStart) / 100;

      onGoingXRotation = p.constrain(onGoingXRotation, -rotationX, p.PI / 2 - rotationX - p.PI / 10);
    } else if (isMoving) {
      onGoingXOffset = p.mouseX - offsetXStart;
      onGoingYOffset = p.mouseY - offsetYStart;
    }
  }
  
  p.mouseReleased = function() {
    if (isRotating) {
      rotationZ += onGoingZRotation;
      rotationX += onGoingXRotation;
      onGoingZRotation = 0;
      onGoingXRotation = 0;
      isRotating = false;
    } else if (isMoving) {
      offsetX += onGoingXOffset;
      offsetY += onGoingYOffset;
      onGoingXOffset = 0;
      onGoingYOffset = 0;
      isMoving = false;
    } else if (state !== ANIMATING && p.mouseButton === p.LEFT) {
      clickedX = p.mouseX;
      clickedY = p.height - p.mouseY;
    }
  }

  p.mouseWheel = function(e) {
    if (e.delta < 0) {
      zoom++;
    } else if (e.delta > 0) {
      zoom--;
    }
    zoom = p.constrain(zoom, -14, 25);
  }

  p.keyReleased = function() {
    if (p.keyCode === 65) {
      if (document.body.className.indexOf('toggleView') === -1) {
        document.body.className += 'toggleView';
      } else {
        document.body.className = document.body.className.split(' ').filter(n => n != 'toggleView').join(' ');
      }
    }
  }

}

function s3(p) {
  let rotationZStart = 0;
  let isRotating = false;
  
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
  }

  p.idle = function() {
    p.loadPixels();
    if (clickedX && clickedY) {
      let index = (clickedY * p.width + clickedX) * 4;
      selectedCell = p.pixels[index];
      clickedX = null;
      clickedY = null;
    }
  }
  
  p.draw = function() {
    p.idle();

    if (state === ANIMATING) return;

    p.background(255);

    p.translate(offsetX + onGoingXOffset, 0, zoom * 20);
    p.rotateX(rotationX + onGoingXRotation);
    p.rotateZ(rotationZ + onGoingZRotation);
    p.translate(0, offsetY + onGoingYOffset, 0);

    p.noStroke();
    
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        let cell_height = grid[j][i];

        if (cell_height !== 0) continue;

        let x = -120 + j * 60;
        let y = -120 + i * 60;
        let z = 0;

        let c = i * w + j;

        p.push(); {
          p.translate(x, y, z);
          p.fill(c);
          p.plane(54);
        } p.pop();
      }
    }

    for (let floor of floors) {
      floor.draw(p);
    }

    let player = getCurrentPlayer();
    for (let character of player.characters) {
      let c = character.gridPosition.y * w + character.gridPosition.x;
      p.fill(c);

      character.draw(p);
    }
  }
}

function checkEndingConditions() {
  for (const player of players) {
    for (const character of player.characters) {
      if (character.height() === 3) {
        gameOver = true;
        winner = player;
      }
    }
  }
}
  
function boxIsEmpty(x, y) {
  for (let player of players) {
    if (player.hasCharacterAt(x, y) >= 0) return false;
  }
  return true;
}

function getCurrentPlayer() {
  return players[currentPlayer];
}

function getSelectedCharacter() {
  return players[currentPlayer].getSelectedCharacter();
}

function unselectAllCharacters() {
  for (let player of players) {
    player.unselectAllCharacters();
  }
}

function nextPlayer() {
  currentPlayer = (currentPlayer + 1) % players.length;
}

function get3DPositionFor(x, y) {
  let z = 15;
  if (grid[x][y] > 0) {
    z += 46 * 54 / 76;
  }
  if (grid[x][y] > 1) {
    z += 44 * 54 / 76;
  }
  if (grid[x][y] > 2) {
    z += 26 * 54 / 76;
  }
  x = -120 + x * 60;
  y = -120 + y * 60;

  return {x, y, z};
}

function createTextTexture(p, string, size) {
  let myP5 = p.createGraphics(0, 0);
  myP5.textStyle(myP5.BOLD);
  myP5.textSize(size);
  let width = myP5.textWidth(string);

  let texture = p.createGraphics(width, size * 1.2);
  texture.textStyle(myP5.BOLD);
  texture.textSize(size);
  texture.textAlign(myP5.LEFT, myP5.TOP);
  texture.text(string, 0, 0);

  myP5.remove();

  return texture;
}

function buildFloorAt(x, y) {
  let floorX = -120 + x * 60;
  let floorY = -120 + y * 60;
  let floorZ = 0 + grid[x][y] * 46 * 54 / 76;
  grid[x][y]++;
  let model = floorMods[grid[x][y] - 1];
  nbFloors[grid[x][y] - 1]--;
  if (grid[x][y] === 1) {
    floorZ = 0;
  } else if (grid[x][y] === 2) {
    floorZ = 46 * 54 / 76;
  } else if (grid[x][y] === 3) {
    floorZ = (46 + 44) * 54 / 76;
  } else {
    floorZ = (46 + 44 + 26) * 54 / 76;
  }
  let floor = new Floor(model, floorX, floorY, floorZ, 54/76, 0, 54 / 76 * (Math.random() < 0.5 ? 1 : -1), y * w + x);
  floors.push(floor);

  let animation = new Animation(floor.scale, {y: 54/76}, (n, t) => n / t,  400, function() {
    state = CHOOSE_CHARACTER;
    checkEndingConditions();
    if (gameOver) {
      state = GAME_OVER;
    } else {
      nextPlayer();
    }
  });
  animationManager.add(animation);
}

function resetDirectionalLights(p) {
    p._renderer.directionalLightColors = [];
    p._renderer.directionalLightDirections = [];
    p._renderer._useLightShader().setUniform('uDirectionalLightCount', 0)
}

function resetPointLights(p) {
    p._renderer.pointLightColors = [];
    p._renderer.pointLightPositions = [];
    p._renderer._useLightShader().setUniform('uPointLightCount', 0)
}

class Player {
  
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.characters = [];
  }
  
  addCharacterAt(x, y) {
    let character = new Character({x, y}, get3DPositionFor(x, y), false, this);
    this.characters.push(character);
  }
  
  hasCharacterAt(x, y) {
    for (let i = 0; i < this.characters.length; i++) {
      if (this.characters[i].isAt(x, y)) {
        return i;
      }
    }
    return -1;
  }
  
  selectCharacter(n) {
    if (n < this.characters.length) {
      this.characters[n].select();
    }
  }
  
  unselectCharacter(n) {
    if (n < this.characters.length) {
      this.characters[n].unselect();
    }
  }
  
  unselectAllCharacters() {
    for (let character of this.characters) {
      character.unselect();
    }
  }
  
  getSelectedCharacter() {
    for (let i = 0; i <this.characters.length; i++) {
      if (this.characters[i].selected) {
        return this.characters[i];
      }
    }
    return null;
  }
  
}

class Character {
  
  constructor(gridPosition, position, selected, player) {
    this.gridPosition = gridPosition;
    this.position = position;
    this.selected = selected;
    this.player = player;
  }

  isAt(x, y) {
    return this.gridPosition.x === x && this.gridPosition.y === y;
  }
  
  select() {
    this.selected = true;
  }
  
  unselect() {
    this.selected = false;
  }
  
  isNextTo(x, y) {
    return Math.abs(this.gridPosition.x - x) <= 1 && Math.abs(this.gridPosition.y - y) <= 1;
  }
  
  canAccess(x, y) {
    return this.isNextTo(x, y) && grid[this.gridPosition.x][this.gridPosition.y] + 1 >= grid[x][y] && boxIsEmpty(x, y);
  }
  
  moveTo(x, y, onEndCallback) {
    let p = get3DPositionFor(x, y);
    let duration = 400;
    let transition = (n, t) => n / t;
    if (grid[this.gridPosition.x][this.gridPosition.y] < grid[x][y]) {
      // transition = (n, t) => 1 - ((1 - n / t) ** 2);
      transition = (n, t) => cubicBezier(n / t, {x:0,y:0}, {x:0,y:1.5}, {x:1,y:1.5}, {x:1,y:1}).y;
    } else if (grid[this.gridPosition.x][this.gridPosition.y] > grid[x][y]) {
      transition = (n, t) => cubicBezier(n / t, {x:0,y:0}, {x:0,y:-0.5}, {x:1,y:-0.5}, {x:1,y:1}).y;
    }

    let endingPosition = {x: p.x, y: p.y};
    let animation = new Animation(this.position, endingPosition, (n, t) => n / t, duration, onEndCallback);
    animationManager.add(animation);

    endingPosition = {z: p.z};
    animation = new Animation(this.position, endingPosition, transition, duration, onEndCallback);
    animationManager.add(animation);

    this.gridPosition.x = x;
    this.gridPosition.y = y;
  }
  
  height() {
    return grid[this.gridPosition.x][this.gridPosition.y];
  }
  
  draw(p, model) {
    p.push(); {
      p.translate(this.position.x, this.position.y, this.position.z);
      p.rotateX(-90 * Math.PI / 180);
      p.cylinder(15, 30, 15, 15);
    } p.pop();
  }

}

class Floor {

  constructor(model, x, y, z, scaleX, scaleY, scaleZ, positionId) {
    this.model = model;
    this.position = {x, y, z};
    this.scale = {x: scaleX, y: scaleY, z: scaleZ};
    this.rotationZ = Math.floor(Math.random() * 4) * Math.PI / 2;
    this.positionId = positionId;
  }

  draw(p, material) {
    if (material === undefined) {
      material = this.positionId;
    }

    p.push(); {
      p.ambientMaterial(material);
      p.translate(this.position.x, this.position.y, this.position.z);
      p.rotateX(p.PI/2);
      p.rotateY(this.rotationZ);
      p.scale(this.scale.x, this.scale.y, this.scale.z);
      p.model(this.model);
    } p.pop();
  }

}

var mousePicking;

document.addEventListener('DOMContentLoaded', function() {
  new p5(s2, 'left');
  mousePicking = new p5(s3, 'right');

  let regles = document.getElementById('regles');
  let openButton = document.getElementsByClassName('open')[0];

  openButton.addEventListener('click', function() {
    if (regles.classList.contains('visible')) {
      regles.className = regles.className.split(' ').filter(n => n != 'visible').join(' ');
    } else {
      regles.className += ' visible';
    }
  })
});