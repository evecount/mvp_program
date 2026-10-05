/**
 * Lightweight canvas confetti generator for passing celebrations
 */
class ConfettiLauncher {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.colors = ["#fc6736", "#e2431a", "#0c0c0e", "#f4f2ee", "#ffb38f"];   // the site's orange, ink and paper
  }

  init() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "confetti-canvas";
      this.canvas.style.position = "fixed";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
      this.canvas.style.width = "100vw";
      this.canvas.style.height = "100vh";
      this.canvas.style.pointerEvents = "none";
      this.canvas.style.zIndex = "9999";
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      window.addEventListener("resize", () => this.resize());
    }
    this.resize();
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  fire(count = 140) {
    this.init();
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.28,
        opacity: 1,
        life: 0
      });
    }

    if (!this.animationId) {
      this.loop();
    }
  }

  loop() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rSpeed;
      p.life++;

      if (p.life > 90) {
        p.opacity -= 0.02;
      }

      if (p.opacity <= 0 || p.y > this.canvas.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.loop());
    } else {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
}

window.confetti = new ConfettiLauncher();
