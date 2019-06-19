class Animation {
  
  constructor(target, to, action, duration, onEnd) {
    this.target = target;
    this.from = {};
    for (const p in target) {
      this.from[p] = target[p];
    }
    this.to = to;
    this.action = action;
    this.duration = duration;
    this.startingTime = new Date().getTime();
    this.isOver = false;
    this.onEnd = onEnd;
  }
  
  play() {
    let diff = new Date().getTime() - this.startingTime;
    
    if (diff >= this.duration) {
      this.end();
    } else {
      for (const p in this.to) {
        let ratio = this.action(diff, this.duration);
        if (this.from.hasOwnProperty(p)) {
          this.target[p] = this.from[p] + (this.to[p] - this.from[p]) * ratio;
        }
      }
    }
  }
  
  end() {
    for (const p in this.to) {
      this.target[p] = this.to[p];
    }
    this.isOver = true;
    if (this.onEnd) {
      this.onEnd();
    }
  }
  
}