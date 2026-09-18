# The build context contains the extracted GitHub release archive in plugins/.
FROM alpine:3.23
LABEL org.opencontainers.image.source="https://github.com/eottabom/istio-headlamp-plugin" \
      org.opencontainers.image.description="Built Istio plugin for Headlamp; copy /plugins into Headlamp's plugin volume." \
      org.opencontainers.image.licenses="Apache-2.0"
COPY plugins/ /plugins/
CMD ["/bin/sh", "-c", "cp -R /plugins/. /headlamp/plugins/"]
