<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Migraine Web Application</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="lib/bootstrap/dist/css/bootstrap.min.css">
		<link rel="stylesheet" href="lib/spectrum/spectrum.css">
		<link rel="stylesheet" href="css/main.css?m=<?php
		$filemtime = filemtime(dirname(__FILE__) . '/' . 'css/main.css');
		print ($filemtime ? $filemtime : uniqid());
		?>">
	</head>
	<body>
		
		<div class="container">
	
			<!-- disclaimer panel -->
			<div id="disclaimer-panel" class="row">
				<div class="col-sm-12">
				
					<h1>Migraine Web Application</h1>

					<div class="alert alert-danger">
					<p><strong>Disclaimer</strong></p>
					<p>This application should only be used under the direction of a doctor. Please use the settings recommended by your doctor. By using this application, you accept full responsibility and liability for any issues or side effects that arise from its use.</p>
					</div>
					
					<h1>Welcome</h1>
					<p>This web application helps doctors and researchers treat patients with migraines. A common treatment involves the patient watching dots rotating on a screen in a dark room. This web application provides this treatment, and works on any modern browser or mobile device.</p>
					
					<h1>System Requirements</h1>
					<p>On Windows and Mac, this application supports the latest versions of the following browsers: Google Chrome, Mozilla Firefox, Internet Explorer 10+, Safari, Opera, and Microsoft Edge. Mobile device support varies by device and vendor (the latest versions of major mobile browsers are typically supported). This application works in browsers which support HTML5 Canvas and requestAnimationFrame(). This application also uses cookies and local browser storage to save settings.</p>				
					
					<h1>License</h1>
					<p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>

					<h1>Copyright</h1>
					<p>Copyright &copy; Anton Yakushin - All Rights Reserved.<br />
					This web application is proprietary and confidential. Unauthorized copying of this file and any file used in this web application, via any medium, is strictly prohibited.<br />
					Written by Anton Yakushin, December 16, 2016.</p>

					<h1>Accept</h1>
					<p>Click the button below to accept the terms of the Disclaimer, License, and Copyright above.</p>
					<button class="btn btn-danger btn-lg" id="disclaimer-button">Accept and Continue</button>

				</div>
			</div>

			<!-- settings panel -->
			<div id="settings-panel" class="row default-hidden">
				<div class="col-sm-12">

					<h1>Settings</h1>

					<form>

						<fieldset>
							<div class="form-group col-sm-4">
								<label for="settings-direction">Rotation direction <a href="#" data-popup="This is the direction dots will rotate on the screen">(?)</a></label>
								<select class="form-control" id="settings-direction">
									<option value="clockwise">Clockwise</option>
									<option value="counterclockwise">Counterclockwise</option>
								</select>
							</div>
							<div class="form-group col-sm-4">
								<label for="settings-items">Number of dots <a href="#" data-popup="This is the total number of dots that appear on the screen">(?)</a></label>
								<input type="text" class="form-control integers-only" id="settings-items" />
							</div>
							<div class="form-group col-sm-4">
								<label for="settings-speed">Speed (degrees per second) <a href="#" data-popup="This is the number of degrees a dot travels in one second around the center circle">(?)</a></label>
								<input type="text" class="form-control decimals-only" id="settings-speed" />
							</div>
						</fieldset>

						<fieldset>
							<div class="form-group col-sm-2">
								<label for="settings-item-size">Dot size <a href="#" data-popup="This is the size of the dots as a percent of the screen size">(?)</a></label>
								<input type="text" class="form-control decimals-only" id="settings-item-size" />
							</div>
							<div class="form-group col-sm-2">
								<label for="settings-screen-size">Screen size <a href="#" data-popup="This is the percent of the available screen size that will be used to animate dots">(?)</a></label>
								<input type="text" class="form-control decimals-only" id="settings-screen-size" />
							</div>
							<div class="form-group col-sm-2">
								<label for="settings-screen-position">Screen position <a href="#" data-popup="This is the percent of the available screen size, representing how for up or down from the center the animation is positioned">(?)</a></label>
								<input type="text" class="form-control decimals-only" id="settings-screen-position" />
							</div>
							<div class="form-group col-sm-3">
								<label for="settings-color-foreground">Dot color <a href="#" data-popup="This is the color of each dot">(?)</a></label>
								<input type="text" class="form-control" id="settings-color-foreground" />
							</div>
							<div class="form-group col-sm-3">
								<label for="settings-color-background">Background color <a href="#" data-popup="This is the background color, under the dots">(?)</a></label>
								<input type="text" class="form-control" id="settings-color-background" />
							</div>
						</fieldset>

						<fieldset>
							<div class="form-group col-sm-6">
								<label for="settings-metronome">Metronome <a href="#" data-popup="Metronome (not available in all browsers) plays 14 notes of a piano scale in a loop">(?)</a></label>
								<select class="form-control" id="settings-metronome">
									<option value="on">On</option>
									<option value="off" selected>Off</option>
								</select>
							</div>
							<div class="form-group col-sm-6">
								<label for="settings-frequency">Metronome frequency (Hz) <a href="#" data-popup="This is frequency with which the metronome scale should be played; some devices may not play all notes">(?)</a></label>
								<input type="text" class="form-control decimals-only" id="settings-frequency" />
								A full scale will be played every <span id="settings-frequency-explanation"></span> seconds.
							</div>
						</fieldset>

						<fieldset>
							<div class="form-group col-sm-6">
								<label for="settings-stop-after">Stop after (seconds) <a href="#" data-popup="This is the number of seconds after which the application should automatically exit and return to the settings screen">(?)</a></label>
								<input type="text" class="form-control integers-only" id="settings-stop-after" placeholder="Optional" />
							</div>
							<div class="form-group col-sm-6">
								<label for="settings-fullscreen">Fullscreen mode <a href="#" data-popup="Fullscreen mode (not available in all browsers) will take up the whole screen; press the escape key to exit fullscreen mode">(?)</a></label>
								<select class="form-control" id="settings-fullscreen">
									<option value="on" selected>On</option>
									<option value="off">Off</option>
								</select>
							</div>
						</fieldset>
						
					</form>
					
					<h1>Usage</h1>
					<p>To exit the application and return to the settings, click anywhere on the screen or press any key (except the keys described below).</p>
					<p>Use the following keys to change settings while the application is running:</p>
					<ul>
						<li>LEFT slows down rotation</li>
						<li>RIGHT speeds up rotation</li>
						<li>UP increases the screen size</li>
						<li>DOWN decreases the screen size</li>
						<li>Q moves the screen up</li>
						<li>A moves the screen down</li>
					</ul>

					<button class="btn btn-primary btn-lg" id="settings-run-button">Start Web Application</button>
					<button class="btn btn-default btn-lg" id="settings-reset-button">Reset Defaults</button>
					
				</div>
			</div>
			
		</div>
		
		<!-- app panel (outside container) -->
		<div id="app-panel" class="default-hidden">
			
			<canvas id="app-canvas"></canvas>

		</div>

		<!-- modal popup -->
		<div id="modal-popup" class="modal fade" role="dialog">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal">&times;</button>
						<h4 class="modal-title"></h4>
					</div>
					<div class="modal-body">
						<p></p>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- audio -->
		<div class="default-hidden">
			<audio preload="auto" data-note="c1">
				<source src="lib/mp3-piano-sound/mp3/c1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/c1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="d1">
				<source src="lib/mp3-piano-sound/mp3/d1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/d1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="e1">
				<source src="lib/mp3-piano-sound/mp3/e1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/e1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="f1">
				<source src="lib/mp3-piano-sound/mp3/f1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/f1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="g1">
				<source src="lib/mp3-piano-sound/mp3/g1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/g1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="a1">
				<source src="lib/mp3-piano-sound/mp3/a1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/a1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="b1">
				<source src="lib/mp3-piano-sound/mp3/b1.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/b1.ogg" type="audio/ogg">
			</audio>
			<audio preload="auto" data-note="c2">
				<source src="lib/mp3-piano-sound/mp3/c2.mp3" type="audio/mpeg">
				<source src="lib/ogg-piano-sound/ogg/c2.ogg" type="audio/ogg">
			</audio>
		</div>

		<!-- scripts -->
		<script src="js/jquery.min.js"></script>
		<script src="lib/bootstrap/dist/js/bootstrap.min.js"></script>
		<script src="lib/spectrum/spectrum.js"></script>
		<script src="lib/js-cookie/src/js.cookie.js"></script>
		<script src="js/main.js?m=<?php
			$filemtime = filemtime(dirname(__FILE__) . '/' . 'js/main.js');
			print ($filemtime ? $filemtime : uniqid());
		?>"></script>
	</body>
</html>