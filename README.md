<b>Note</b> : Tested on Raspberry Pi 2 Model B<br>
<b>Installation :</b>
<ul>
	<li>Prerequisites : <i>$ apt-get install node git libasound2-dev pi</i></li>
	<li><i>$ cd ~/</i></li>
	<li><i>$ mkdir apps</i></li>
	<li><i>$ cd apps</i></li>
	<li>Clone the App : <i>$ git clone https://github.com/rohitm/raspi-radio.git</i></li>
	<li>Install dependencies : <i>$ npm update</i></li>
</ul>
<b>Running the App :</b>
<ul>
	<li> Go to the folder : <i>$ cd ~/apps/raspi-radio</i></li>
	<li> Assign execute permissions to the startup script : <i>$ sudo chmod -R 777 iceberry.sh</i> </li>
	<li> Run the app : <i>$ ./iceberry.sh</i> </li>
	<li> On the Browser goto : http://<i>ip-address-of-pi</i>:8080/</li>
</ul>
<br>
<b>Run the app on startup :</b>
<ul>
	<li> Copy the startup script to the init.d folder. <i>$ sudo cp iceberry.sh /etc/init.d/</i> </li>
	<li> Register the app with update-rc. <i>$ sudo /usr/sbin/update-rc.d iceberry.sh defaults</i> </li>
	<li> Reboot Pi and Test. <i>$ sudo reboot</i> </li>
</ul>	
<br>
<b>Test Radio stations :</b><br>
Costa Del Mar : http://listen.radionomy.com/costa-del-mar<br>
ABC Lounge Radio : http://listen.radionomy.com/abc-lounge<br>
ABC Dance Radio : http://listen.radionomy.com/abc-dance<br>
BBC News : http://bbcwssc.ic.llnwd.net/stream/bbcwssc_mp1_ws-eieuk<br>
80'S Radio : http://62.204.145.218:8000/radio164<br>
