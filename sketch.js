function loadRoutes(routesData) {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;

  const routesParsed = JSON.parse(routesData[0]);

  // Iterate through each feature
  routesParsed.features.forEach(feature => {
    const nazLinky = feature.properties.naz_linky; // Get 'naz_linky'
    const geometryType = feature.geometry.type; // Get geometry type
    const coordinates = feature.geometry.coordinates; // Get coordinates

    console.log(`naz_linky: ${nazLinky}`);
    console.log(`Geometry Type: ${geometryType}`);

    fill(50);

    if (geometryType === "LineString") {
      //console.log('Coordinates:');
      coordinates.forEach(pair => {
        //console.log(`  [${pair[0]}, ${pair[1]}]`);
        let pairCanvas = coordsToCanvas(pair);
        circle(pairCanvas[0], pairCanvas[1],5);
        if (pair[0] < minx) minx = pair[0];
        if (pair[0] > maxx) maxx = pair[0];
        if (pair[1] < miny) miny = pair[1];
        if (pair[1] > maxy) maxy = pair[1];
      });
    } else if (geometryType === "MultiLineString") {
      //console.log('Coordinates:');
      coordinates.forEach(line => {
        //console.log('  Line:');
        line.forEach(pair => {
          //console.log(`    [${pair[0]}, ${pair[1]}]`);
          let pairCanvas = coordsToCanvas(pair);
          circle(pairCanvas[0], pairCanvas[1],5);
          //console.log(`${pairCanvas[0]}, ${pairCanvas[1]}`);
        });
      });
    } else {
      console.log(`Unknown geometry type: ${geometryType}`);
    }
  });

  console.log(`minx: ${minx}`);
  console.log(`maxx: ${maxx}`);
  console.log(`miny: ${miny}`);
  console.log(`maxy: ${maxy}`);
}

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

  if (tramsParsed.attributes.lng < boundariesLng[0] || tramsParsed.attributes.lng > boundariesLng[1] || 
      tramsParsed.attributes.lat < boundariesLat[0] || tramsParsed.attributes.lat > boundariesLat[1]) {
    //console.log(`tram ${tramsParsed.attributes.lineid}: ${tramsParsed.attributes.lng}, ${tramsParsed.attributes.lat}`);
    //console.log('outside boundaries: 16.507-16.693, 49.126-49.248');
    return;
  }

  let pairCanvas = coordsToCanvas([tramsParsed.attributes.lng, tramsParsed.attributes.lat]);

  if (!updateTram(tramsParsed.attributes.id, pairCanvas)) {
    // if (tramsid.indexOf(tramsParsed.attributes.id) !== -1) {
    //   console.log(`Duplicate tramid: ${tramsParsed.attributes.id}`);
    // }
    //tramsid.push(tramsParsed.attributes.id);
    trams.push(new Tram(tramsParsed.attributes.id, tramsParsed.attributes.lineid, tramsParsed.attributes.linename, pairCanvas));
    //seenTrams.add(tramsParsed.attributes.lineid);
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
  return false;
}

function checkSleepingTrams() {

  for(const tram of trams) {
    if (!tram.isSleeping && tram.lastUpdateFrame + 5400 < frameCount) { // inactive for 3 mins
      console.log(`Sleeping: ${tram.lineid}`);
      tram.traces = [];
      tram.isSleeping = true;
    }
  }
  //save(`heartbeat_of_brno_${img_count}`);
  //img_count++;
}

function setMappedBorders() {
  mappedWidthMin = canvasWidth / 2 - mapWidth / 2;
  mappedWidthMax = canvasWidth / 2 + mapWidth / 2;
  mappedHeightMin = canvasHeight / 2 - mapHeight / 2; 
  mappedHeightMax = canvasHeight / 2 + mapHeight /2;
}

// const colors = new Map([
//   [1, '#FF0202'],
//   [2, '#FF1717'],
//   [3, '#FF2C2C'],
//   [4, '#FF4141'],
//   [5, '#FF5656'],
//   [6, '#FF6B6B'],
//   [7, '#FF8080'],
//   [8, '#FF9595'],
//   [9, '#FFAAAA'],
//   [10, '#FFBFBF'],
//   [11, '#FFD4D4'],
//   [12, '#FFE9E9'],
// ]);

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
let mapWidth = 800;
let mapHeight = 800;
let mappedWidthMin = 0;
let mappedHeightMin = 0;
let mappedWidthMax = 0;
let mappedHeightMax = 0;
let host = 'gis.brno.cz/geoevent/ws/services/ODAE_public_transit_stream/StreamServer/subscribe?outSR=4326';
let socket; // the websocket
let routesGeoJSON;
let boundariesLat = [49.126, 49.248]
let boundariesLng = [16.507, 16.693]
let trams = [];
let tramsid = [];
let img_count = 0;

// Load the text and create an array. TODO remove when not needed
function preload() {
  //routesGeoJSON = loadStrings('./files/transit_routes.geojson');
}

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  frameRate(30);
  setMappedBorders();

  //traceLayer = createGraphics(width, height);
  //traceLayer.background(20, 20, 20);
  //traceLayer.noStroke();

  //loadRoutes(routesGeoJSON);

  // connect to server:
  socket = new WebSocket('wss://' + host);
  // socket connection listener:
  socket.onopen = sendIntro;
  // socket message listener:
  socket.onmessage = readMessage;

  //fr = createP('');
}

function draw() {
  background(20, 20, 20);
  //traceLayer.background(20, 20, 20);
  for (let tram of trams) {
    tram.showTraces();
    tram.show();
  }
  //image(traceLayer, 0, 0);
  // for (let tram of trams) {
  //   tram.show();
  // }
  
  if (frameCount % 5400 === 0) {
    console.log(`trams amount: ${trams.length}`)
    checkSleepingTrams();
  }
  //fr.html(floor(frameRate()));
}
