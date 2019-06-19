class AnimationManager {
  
  constructor() {
    this.animations = [];
  }
  
  add(animation) {
    this.animations.push(animation);
  }
  
  clean() {
    for (const animation of this.animations) {
      animation.end();
    }
    this.animations = [];
  }
  
  play() {
    for (const animation of this.animations) {
      animation.play();
    }
    this.animations = this.animations.filter(a => !a.isOver);
  }
  
  stop() {
    this.animations = [];
  }
  
}