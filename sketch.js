// This project uses API for live tram GPS from links below, which is under CC BY 4.0 license.
// https://gis.brno.cz/esri/home/item.html?id=e8aa121910df41bb9a28e4ca34a263c7
// https://data.brno.cz/datasets/mestobrno::polohy-vozidel-hromadn%C3%A9-dopravy-public-transit-positional-data/about

// send msg after connecting to socket
function sendIntro() {
  // send filter to receive only trams
  socket.send('{"filter":{"where":"vtype=0"}}');
}

// react to received msg from socket
function readMessage(event) {
  var msg = event.data;
  const tramsParsed = JSON.parse(msg);
  if (!tramsParsed.geometry) {
    console.log('not trams, maybe filter response');
    return;
  }

  // dont process trams outside bounds
  if (tramsParsed.attributes.lng < boundariesLng[0] || tramsParsed.attributes.lng > boundariesLng[1] || 
      tramsParsed.attributes.lat < boundariesLat[0] || tramsParsed.attributes.lat > boundariesLat[1]) {
    return;
  }

  let pairCanvas = coordsToCanvas([tramsParsed.attributes.lng, tramsParsed.attributes.lat]);

  if (!updateTram(tramsParsed.attributes.id, pairCanvas)) {
    trams.push(new Tram(tramsParsed.attributes.id, tramsParsed.attributes.lineid, tramsParsed.attributes.linename, pairCanvas));
  }
}

function coordsToCanvas(coords) {
  let x = map(coords[0], 16.50, 16.70, mappedWidthMin, mappedWidthMax, true);
  let y = map(coords[1], 49.125, 49.25, mappedHeightMax, mappedHeightMin, true);
  return [floor(x), floor(y)];
}

// update tram after new coords are received
function updateTram(id, coords) {
  for(const tram of trams) {
    if (tram.id === id) {
      tram.updateCoords(coords);
      return true;
    }
  }
  return false; // tram not found, probably new one
}

function checkSleepingTrams() {
  for(const tram of trams) {
    if (!tram.isSleeping && tram.lastUpdateFrame + 5400 < frameCount) { // inactive for 3 mins
      console.log(`Sleeping: ${tram.lineid}`);
      tram.traces = [];
      tram.isSleeping = true;
    }
  }
}

function setMappedBorders() {
  mappedWidthMin = canvasWidth / 2 - mapWidth / 2;
  mappedWidthMax = canvasWidth / 2 + mapWidth / 2;
  mappedHeightMin = canvasHeight / 2 - mapHeight / 2; 
  mappedHeightMax = canvasHeight / 2 + mapHeight /2;
}

function loading() {
  trams.push(new Tram(0, 0, 0, [0,500]));
  updateTram(0, [canvasWidth,500]);
}

// set red brightness for each line number
const rgbColor = new Map([
  [1, 0],
  [2, 15],
  [3, 30],
  [4, 45],
  [5, 60],
  [6, 75],
  [7, 90],
  [8, 105],
  [9, 120],
  [10, 135],
  [11, 150],
  [12, 165],
]);

let fr;
let canvasWidth = 1920;
let canvasHeight = 1080;
let mapWidth = 1000;
let mapHeight = 1000;
let mappedWidthMin = 0;
let mappedHeightMin = 0;
let mappedWidthMax = 0;
let mappedHeightMax = 0;
let host = 'gis.brno.cz/geoevent/ws/services/ODAE_public_transit_stream/StreamServer/subscribe?outSR=4326'; // API for trams
let socket; // the websocket
let routesGeoJSON;
let boundariesLat = [49.126, 49.248]
let boundariesLng = [16.507, 16.693]
let trams = [];
let tramsid = [];
let img_count = 0;
let centerCoords = [];

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  frameRate(30);
  setMappedBorders();
  centerCoords = [mapWidth * 0.55 + mappedWidthMin, mapHeight * 0.45 + mappedHeightMin]; // city center coords

  // connect to server
  socket = new WebSocket('wss://' + host);
  // socket connection listener
  socket.onopen = sendIntro;
  // socket message listener
  socket.onmessage = readMessage;

  //fr = createP('');
  loading();
}

function draw() {
  background(0);
  for (let tram of trams) {
    tram.showTraces();
  }
  for (let tram of trams) {
    tram.show();
  }
  
  if (frameCount % 5400 === 0) { // remove sleeping trams each 180 seconds
    console.log(`trams amount: ${trams.length}`)
    checkSleepingTrams();
  }
  // captures images every frame up to 40 seconds
  // if (frameCount > 3600 && frameCount < 4800) {
  //   save(`heartbeat_of_brno_${img_count}`);
  //   img_count++;
  // }

  //fr.html(floor(frameRate()));

  // remove loading tram
  if (frameCount === 450) {
    trams.shift();
  }
}
