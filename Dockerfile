FROM oldiy/dosgame-web-docker@sha256:082e2f84cb8a3212f1ff1e2d66f92f9e7d84673cd25e0667e75f86ee48a7d639

LABEL org.opencontainers.image.source="https://github.com/9904099/chinese-dos-games-web"
LABEL org.opencontainers.image.description="Chinese DOS games web with mobile virtual controls"

COPY templates/ /app/templates/
COPY static/css/ /app/static/css/
COPY static/js/ /app/static/js/
