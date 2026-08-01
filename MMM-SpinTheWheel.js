Module.register("MMM-SpinTheWheel", {

  defaults: {
    username: "DITT_DISCOGS_USERNAME"
  },

  getStyles() {
    return ["style.css"];
  },

  getTranslations() {
    return {
      en: "translations/en.json",
      sv: "translations/sv.json",
      de: "translations/de.json"
    };
  },

  start() {
    this.collection = [];
    this.shufflePool = [];
    this.current = null;
    this.angle = 0;
    this.totalLoaded = 0;

    this.sendSocketNotification("GET_COLLECTION", {
      username: this.config.username,
      language: config.language || "en"
    });
  },

  socketNotificationReceived(n, p) {

    if (n === "COLLECTION_RESULT") {
      this.collection = p;
      this.totalLoaded = p.length;
      this.buildPool();
      setTimeout(() => this.spin(), 600);
    }

    if (n === "TRIGGER_SPIN")
      this.spin();

    if (n === "RESET_SHUFFLE") {
      this.buildPool();
      this.spin();
    }
  },

  buildPool() {
    this.shufflePool = [...this.collection];

    for (let i = this.shufflePool.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.shufflePool[i], this.shufflePool[j]] = [this.shufflePool[j], this.shufflePool[i]];
    }
  },

  spin() {

    if (!this.shufflePool.length)
      this.buildPool();

    this.current = this.shufflePool.pop();

    this.sendSocketNotification("NOW_PLAYING", this.current);

    this.updateDom(0);

    setTimeout(() => {
      if (this.vinyl) {
        this.angle += 360;
        this.vinyl.style.transform = `rotate(${this.angle}deg)`;
      }
    }, 60);
  },

  addVinylControls(vinyl) {
    let dragging = false;
    let pointerId = null;
    let lastX = 0;

    vinyl.style.touchAction = "none";

    vinyl.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0)
        return;

      dragging = true;
      pointerId = event.pointerId;
      lastX = event.clientX;
      vinyl.style.transition = "none";

      if (vinyl.setPointerCapture)
        vinyl.setPointerCapture(pointerId);

      event.preventDefault();
    });

    vinyl.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId)
        return;

      this.angle += event.clientX - lastX;
      lastX = event.clientX;
      vinyl.style.transform = `rotate(${this.angle}deg)`;
      event.preventDefault();
    });

    const finish = (event) => {
      if (!dragging || event.pointerId !== pointerId)
        return;

      dragging = false;
      vinyl.style.transition = "";

      if (vinyl.hasPointerCapture?.(pointerId))
        vinyl.releasePointerCapture(pointerId);

      pointerId = null;
      event.preventDefault();
      this.spin();
    };

    vinyl.addEventListener("pointerup", finish);
    vinyl.addEventListener("pointercancel", finish);
  },

  getDom() {

    const wrap = document.createElement("div");
    wrap.className = "spinWrap";

    if (!this.current) {
      wrap.innerHTML = this.translate("LOADING");
      return wrap;
    }

    const vinyl = document.createElement("div");
    vinyl.className = "vinyl";
    this.vinyl = vinyl;
    this.addVinylControls(vinyl);

    const img = document.createElement("img");
    img.src = this.current.cover;
    img.className = "label";
    vinyl.appendChild(img);

    const title = document.createElement("div");
    title.className = "title";
    title.innerHTML = this.current.title;

    const artist = document.createElement("div");
    artist.className = "artist";
    artist.innerHTML = this.current.artist;

    const count = document.createElement("div");
    count.className = "count";
    count.innerHTML = `📀 ${this.totalLoaded} ${this.translate("RECORDS")}`;

    wrap.appendChild(vinyl);
    wrap.appendChild(title);
    wrap.appendChild(artist);
    wrap.appendChild(count);

    return wrap;
  }
});
