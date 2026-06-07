const NodeHelper = require("node_helper");
const axios = require("axios");
const express = require("express");

module.exports = NodeHelper.create({

  start() {

    const app = express();

    this.currentTrack = null;
    this.language = "en";

    app.get("/", (req, res) => {

      const text = {
        sv: {
          header: "Vinylkväll",
          loading: "Laddar...",
          tracks: "Låtlista",
          reset: "Återställ"
        },
        de: {
          header: "Vinylabend",
          loading: "Wird geladen...",
          tracks: "Titelliste",
          reset: "Zurücksetzen"
        },
        en: {
          header: "Vinyl Night",
          loading: "Loading...",
          tracks: "Track List",
          reset: "Reset"
        }
      };

      const t = text[this.language] || text.en;

      res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>

body{
 background:#e6dccf;
 color:#222;
 text-align:center;
 font-family:-apple-system,BlinkMacSystemFont,sans-serif;
 margin:0;
 padding:20px;
}

#header{
 font-size:34px;
 font-weight:700;
 margin:10px 0;
}

#title{
 font-size:22px;
 margin-top:10px;
}

#artist{
 opacity:.7;
 margin-top:4px;
}

#wheel{
 width:300px;
 height:300px;
 border-radius:50%;
 margin:30px auto;
 background:repeating-radial-gradient(circle,#000 0,#111 2px,#000 4px);
 box-shadow:
 inset 0 0 40px rgba(255,255,255,.2),
 0 10px 30px rgba(0,0,0,.3);
 display:flex;
 align-items:center;
 justify-content:center;
 touch-action:none;
}

#label{
 width:130px;
 height:130px;
 border-radius:50%;
 background-size:cover;
 background-position:center;
}

button{
 margin-top:18px;
 padding:16px 24px;
 font-size:18px;
 border:none;
 border-radius:14px;
 background:white;
 color:#222;
 box-shadow:0 4px 12px rgba(0,0,0,.15);
}

#covers{
 margin-top:25px;
 display:flex;
 justify-content:center;
}

.cover{
 width:120px;
 border-radius:14px;
 box-shadow:0 8px 25px rgba(0,0,0,.25);
 cursor:pointer;
 transition:.2s;
}

.cover:active{
 transform:scale(.95);
}

#viewer{
 position:fixed;
 inset:0;
 background:rgba(0,0,0,.92);
 display:none;
 align-items:center;
 justify-content:center;
 z-index:999;
}

#viewer img{
 max-width:90%;
 max-height:90%;
 border-radius:14px;
}

#tracks{
 position:fixed;
 inset:0;
 background:white;
 display:none;
 padding:30px;
 overflow:auto;
 color:black;
}

.track{
 margin:10px 0;
 border-bottom:1px solid #ddd;
 padding-bottom:6px;
}

</style>
</head>

<body>

<div id="header">${t.header}</div>

<div id="title">${t.loading}</div>
<div id="artist"></div>

<div id="wheel">
  <div id="label"></div>
</div>

<button onclick="tracks()">📜 ${t.tracks}</button>
<button onclick="reset()">♻️ ${t.reset}</button>

<div id="covers">
  <img id="cover" class="cover">
</div>

<div id="viewer" onclick="this.style.display='none'">
  <img id="viewerImg">
</div>

<div id="tracks"></div>

<script>

let wheel=document.getElementById("wheel")
let label=document.getElementById("label")
let cover=document.getElementById("cover")
let viewer=document.getElementById("viewer")
let viewerImg=document.getElementById("viewerImg")

let frontSrc=""
let backSrc=""
let showingFront=true

cover.onclick=()=>{
 viewer.style.display="flex"
 viewerImg.src=cover.src
}

let startX=0

cover.addEventListener("touchstart",e=>{
 startX=e.touches[0].clientX
})

cover.addEventListener("touchend",e=>{
 let diff=e.changedTouches[0].clientX-startX
 if(Math.abs(diff)<40)return
 showingFront=!showingFront
 cover.src=showingFront ? frontSrc : backSrc
})

let angle=0
let velocity=0
let drag=false
let lastX=0
let lastT=0

wheel.addEventListener("touchstart",e=>{
 drag=true
 lastX=e.touches[0].clientX
 lastT=Date.now()
 velocity=0
})

wheel.addEventListener("touchmove",e=>{
 if(!drag)return

 let x=e.touches[0].clientX
 let now=Date.now()

 let dx=x-lastX
 let dt=now-lastT

 velocity=dx/dt*25
 angle+=dx

 wheel.style.transform="rotate("+angle+"deg)"

 lastX=x
 lastT=now
})

wheel.addEventListener("touchend",()=>{
 drag=false
 spin()
 fetch("/spin")
})

function spin(){
 let f=.975

 function loop(){
  velocity*=f
  angle+=velocity
  wheel.style.transform="rotate("+angle+"deg)"

  if(Math.abs(velocity)>0.15)
   requestAnimationFrame(loop)
 }

 loop()
}

function tracks(){

 fetch("/tracks")
 .then(r=>r.json())
 .then(list=>{

  let box=document.getElementById("tracks")

  box.innerHTML="<h2>${t.tracks}</h2>"

  list.forEach(track=>{
   box.innerHTML += "<div class='track'>"+track+"</div>"
  })

  box.style.display="block"
 })
}

document.getElementById("tracks").onclick=()=>{
 document.getElementById("tracks").style.display="none"
}

function reset(){
 fetch("/reset")
}

function update(){

 fetch("/now")
 .then(r=>r.json())
 .then(d=>{

  if(!d)return

  title.innerText=d.title||""
  artist.innerText=d.artist||""

  if(d.cover){
   label.style.backgroundImage="url("+d.cover+")"
   frontSrc=d.cover
  }

  if(d.images && d.images[1])
   backSrc=d.images[1]
  else
   backSrc=d.cover

  cover.src=showingFront ? frontSrc : backSrc
 })
}

setInterval(update,1000)
update()

</script>

</body>
</html>`);
    });

    app.get("/spin", (req, res) => {
      this.sendSocketNotification("TRIGGER_SPIN");
      res.send("ok");
    });

    app.get("/reset", (req, res) => {
      this.sendSocketNotification("RESET_SHUFFLE");
      res.send("ok");
    });

    app.get("/now", (req, res) => {
      res.json(this.currentTrack || {});
    });

    app.get("/tracks", async (req, res) => {

      if (!this.currentTrack?.id)
        return res.json([]);

      try {

        const r = await axios.get(
          "https://api.discogs.com/releases/" + this.currentTrack.id,
          {
            headers: {
              "User-Agent": "MagicMirrorVinyl"
            }
          }
        );

        this.currentTrack.images = r.data.images.map(i => i.uri);

        res.json(r.data.tracklist.map(t => t.title));

      } catch {
        res.json([]);
      }
    });

    app.listen(3001, () => {
      console.log("Vinyl helper running");
    });
  },

  socketNotificationReceived(n, p) {

    if (n === "NOW_PLAYING")
      this.currentTrack = p;

    if (n === "GET_COLLECTION") {
      this.language = p.language || "en";
      this.fetchCollection(p.username);
    }
  },

  async fetchCollection(user) {

    let all = [];
    let page = 1;
    let pages = 1;

    while (page <= pages) {

      const r = await axios.get(
        "https://api.discogs.com/users/" + user + "/collection/folders/0/releases?page=" + page + "&per_page=100",
        {
          headers: {
            "User-Agent": "MagicMirrorVinyl"
          }
        }
      );

      pages = r.data.pagination.pages;

      r.data.releases.forEach(x => {

        const i = x.basic_information;

        all.push({
          id: i.id,
          title: i.title,
          artist: i.artists[0].name,
          cover: i.cover_image
        });
      });

      page++;
    }

    this.sendSocketNotification("COLLECTION_RESULT", all);
  }

});