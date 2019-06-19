function linearBezier(t, p0, p1) {
  let x = p0.x + t * (p1.x - p0.x);
  let y = p0.y + t * (p1.y - p0.y);
  return {x, y};
}

function quadraticBezier(t, p0, p1, p2) {
  let x = (1 - t) * ((1 - t) * p0.x + t * p1.x) + t * ((1 - t) * p1.x + t * p2.x);
  let y = (1 - t) * ((1 - t) * p0.y + t * p1.y) + t * ((1 - t) * p1.y + t * p2.y);
  return {x, y};
}

function cubicBezier(t, p0, p1, p2, p3) {
  let first = quadraticBezier(t, p0, p1, p2);
  let second = quadraticBezier(t, p1, p2, p3);
  
  let x = (1 - t) * first.x + t * second.x;
  let y = (1 - t) * first.y + t * second.y;
  return {x, y};
}