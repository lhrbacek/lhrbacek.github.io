class Tram {
  constructor(id, lineid, lineName, coords) {
    this.id = id;
    this.lineid = lineid;
    this.lineName = lineName;
    this.lastCoordsCanvas = coords;
    this.currCoordsCanvas = coords;
    this.lastCoordsDrawn = coords;
    this.intervalFrameCount = frameCount + 300;
    this.lastUpdateFrame = frameCount;
    this.lastDrawnAngle = 0;
    this.traces = [];
    this.isSleeping = true;
  }

  updateCoords(coords) {
    if(coords[0] === this.currCoordsCanvas[0] && coords[1] === this.currCoordsCanvas[1]) {
      return;
    }
    // if (abs(coords[0] - this.lastCoordsCanvas[0]) > 50 || abs(coords[1] - this.lastCoordsCanvas[1]) > 50) {
    //   console.log(`${this.lineid}; old: ${this.lastCoordsCanvas[0]},${this.lastCoordsCanvas[1]}; new: ${coords[0]},${coords[1]}`);
    // }
    this.lastCoordsCanvas = this.currCoordsCanvas;
    this.currCoordsCanvas = coords;
    this.lastUpdateFrame = frameCount;
    this.updateIntervalFrameCount();
    this.isSleeping = false;
  }

  updateIntervalFrameCount() {
    this.intervalFrameCount = frameCount + 300; // 10 seconds
  }

  showTraces() {
    //traceLayer.beginShape();
    beginShape();
    if (this.traces.length > 0)
      //traceLayer.curveVertex(this.traces[0].x, this.traces[0].y);
      curveVertex(this.traces[0].x, this.traces[0].y);
    for (let i = 0; i < this.traces.length; i += 40) {
      //traceLayer.curveVertex(this.traces[i].x, this.traces[i].y);
      curveVertex(this.traces[i].x, this.traces[i].y);
    }
    let clr = rgbColor.get(this.lineid);
    if (clr === undefined)
      clr = 180;
    // traceLayer.noFill();
    // traceLayer.stroke(210,clr,clr,255);
    // traceLayer.strokeWeight(3);
    // traceLayer.endShape();
    noFill();
    stroke(210,clr,clr,255);
    strokeWeight(3);
    endShape();
  }

  inCenter(coords) {
    return dist(mapWidth * 0.55 + mappedWidthMin, mapHeight * 0.45 + mappedHeightMin, coords[0], coords[1]) <= 40;
  }

  heartbeatPulse(frame) {
    let beatLength = 45; // Total frames for one heartbeat cycle (e.g., 1 second at 60 FPS)
    let phase = frame % beatLength; // Current frame within the cycle
    
    // Heartbeat pattern: quick pulse, short delay, second pulse, long delay
    if (phase < 5) {
      // First quick beat (frames 0–5)
      return map(phase, 0, 5, 30, 80); // Rising to maximum
    } else if (phase < 10) {
      // Dip after the first beat (frames 5–10)
      return map(phase, 5, 10, 80, 40); // Falling to a medium level
    } else if (phase < 15) {
      // Second beat (frames 10–15)
      return map(phase, 10, 15, 40, 70); // Rising again
    } else if (phase < 20) {
      // Dip after the second beat (frames 5–10)
      return map(phase, 15, 20, 70, 30); // Falling to a medium level
    } else {
      // Resting period (frames 15–25)
      return 30; // Back to baseline
    }
  }

  show() {
    // Calculate normalized progress after the delay
    let t = constrain((frameCount - this.intervalFrameCount + 300) / 300, 0, 1);

    // Calculate the current position
    let x = lerp(this.lastCoordsCanvas[0], this.currCoordsCanvas[0], t);
    let y = lerp(this.lastCoordsCanvas[1], this.currCoordsCanvas[1], t);

    let clr = rgbColor.get(this.lineid);
    if (clr === undefined)
      clr = 180;

    if (this.lastCoordsDrawn[0] !== x || this.lastCoordsDrawn[1] !== y) {
      this.traces.push({x: x, y: y});
      this.lastCoordsDrawn = [x, y];
    }

    let angle = atan2(this.currCoordsCanvas[1] - this.lastCoordsCanvas[1], this.currCoordsCanvas[0] - this.lastCoordsCanvas[0]);
    if (angle === 0) {
      angle = this.lastDrawnAngle;
    }
    this.lastDrawnAngle = angle;
    
    let pulse = 25
    let minPulse = 4;
    let maxPulse = 20;
    let stepPulse = 2;
    if (!this.isSleeping) {
      push();
      translate(x, y); // Move to the tram's position

      if (this.inCenter([x, y])) {
        pulse = this.heartbeatPulse(frameCount);
        minPulse = 8;
        maxPulse = 40;
        stepPulse = 3;
      }
      for (let i = minPulse; i <= maxPulse; i += stepPulse) { // Layers of the glow
        fill(220, 180, 180, map(i, 4, pulse, 60, 0));
        noStroke();
        ellipse(0, 0, i, i); // Expanding circle
      }

      rotate(angle);   // Rotate to match the direction
      fill(180, 50, 50); // Red tram
      noStroke();
      // Draw a triangle pointing right
      triangle(-5, -5, -5, 5, 7, 0); // Adjust size as needed
      pop();
    }
  }
}