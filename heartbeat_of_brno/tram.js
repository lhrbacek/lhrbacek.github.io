// This project uses API for live tram GPS from links below, which is under CC BY 4.0 license.
// https://gis.brno.cz/esri/home/item.html?id=e8aa121910df41bb9a28e4ca34a263c7
// https://data.brno.cz/datasets/mestobrno::polohy-vozidel-hromadn%C3%A9-dopravy-public-transit-positional-data/about

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
    beginShape();
    if (this.traces.length > 0) {
      curveVertex(this.traces[0].x, this.traces[0].y);
    }
    for (let i = 0; i < this.traces.length; i += 40) {
      curveVertex(this.traces[i].x, this.traces[i].y);
    }
    let clr = rgbColor.get(this.lineid);
    if (clr === undefined) {
      clr = 180;
    }  
    noFill();
    stroke(210,clr,clr,255);
    strokeWeight(3);
    endShape();
  }

  inCenter(coords) {
    return 40 >= dist(mapWidth * 0.55 + mappedWidthMin, mapHeight * 0.45 + mappedHeightMin, coords[0], coords[1]);
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
      // Dip after the second beat (frames 15–20)
      return map(phase, 15, 20, 70, 30); // Falling to a medium level
    } else {
      // Resting period (frames 20–45)
      return 30; // Back to baseline
    }
  }

  show() {
    if (this.isSleeping) {
      return;
    }
    // Calculate normalized progress after the delay
    let t = constrain((frameCount - this.intervalFrameCount + 300) / 300, 0, 1);

    // Calculate the current position
    let x = lerp(this.lastCoordsCanvas[0], this.currCoordsCanvas[0], t);
    let y = lerp(this.lastCoordsCanvas[1], this.currCoordsCanvas[1], t);

    // did the tram move
    if (this.lastCoordsDrawn[0] !== x || this.lastCoordsDrawn[1] !== y) {
      this.traces.push({x: x, y: y});
      this.lastCoordsDrawn = [x, y];
    }

    push();
    translate(x, y); // Move to the tram's position

    let pulse = 25
    let minPulse = 4;
    let maxPulse = 20;
    let stepPulse = 2;

    if (this.inCenter([x, y])) {
      pulse = this.heartbeatPulse(frameCount);
      minPulse = 8;
      maxPulse = 40;
      stepPulse = 3;
    }
    // Layers of the glow
    for (let i = minPulse; i <= maxPulse; i += stepPulse) {
      fill(220, 180, 180, map(i, 4, pulse, 60, 0));
      noStroke();
      ellipse(0, 0, i, i); // Expanding circle
    }

    let angleMov = atan2(this.currCoordsCanvas[1] - this.lastCoordsDrawn[1], this.currCoordsCanvas[0] - this.lastCoordsDrawn[0]);
    if (angleMov === 0) {
      angleMov = this.lastDrawnAngle;
    }
    this.lastDrawnAngle = angleMov;

    rotate(angleMov);   // Rotate to match the direction
    fill(180, 50, 50); // Red tram
    noStroke();
    // Draw a triangle pointing right
    triangle(-5, -5, -5, 5, 7, 0); // Adjust size as needed
    pop();
  }
}