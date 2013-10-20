# Start snd_bcm2835 module
echo "Starting snd_bcm2835...\n"
$(sudo modprobe snd_bcm2835)

# Set the volume a little low
echo "Lowering the volume...\n"
$(amixer -c 0 set PCM 90%)

# Start the node process
echo "Starting iceberry...\n"
$(nohup node /home/pi/apps/raspi-radio/app.js)


