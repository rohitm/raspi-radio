<b>Note</b> : The app depends on the alsa sound driver for the raspberry pi<br>
<b>Running the App :</b><br>
<ul>
	<li> Assign execute permissions to the startup script : <i>$ sudo chmod -R 777 iceberry.sh</i> </li>
	<li> Run the app : <i>$ ./iceberry.sh</i> </li>
</ul>
<br>
<b>Run the app on startup :</b><br>
<ul>
	<li> Copy the startup script to the init.d folder. <i>$ sudo cp iceberry.sh /etc/init.d/</i> </li>
	<li> Register the app with update-rc. <i>$ sudo udpate-rc.d iceberry.sh defaults</i> </li>
	<li> Reboot Pi and Test. <i>$ sudo reboot</i> </li>
</ul>	
<br>
<b>Test Radio stations :</b><br>
Costa Del Mar : http://listen.radionomy.com/costa-del-mar<br>
ABC Lounge Radio : http://listen.radionomy.com/abc-lounge<br>
ABC Dance Radio : http://listen.radionomy.com/abc-dance<br>
BBC News : http://bbcwssc.ic.llnwd.net/stream/bbcwssc_mp1_ws-eieuk<br>
80'S Radio : http://62.204.145.218:8000/radio164<br>
