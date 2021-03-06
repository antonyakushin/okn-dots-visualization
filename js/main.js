// after jQuery loaded
$(document).ready(function() {

	// constants
	var constants = {
		framesPerSecond: 120,
		notes: 14,
		cookieOptions: {
			identifier: 'migraine',
			expires: 30
		},
		itemCalculationScreenRadius: 1000,
		itemPercentOfEntropyStrength: 0.5,
		itemMaxEntropyMultiplier: 3,
		itemEntropyMaxAttempts: 100,
		itemSpaceMultiplier: 0.01,
		speedChange: 0.5,
		screenSizeChange: 0.5,
		screenPositionChange: 0.25,
		renderTextForSeconds: 3,
		renderTextSpace: 10,
		minFontSize: 20,
		anglePrecisionSignificantDigits: 4,
		computed: {}
	};
	// defaults
	var defaults = {
		type: 'linear',
		direction: 'clockwise',
		items: 300,
		rotationSpeed: 30,
		peakVelocity: 30,
		rotationFrequency: 0.05,
		itemSize: 2,
		screenSize: 100,
		screenPosition: 0,
		foregroundColor: '#CCC',
		backgroundColor: '#000',
		metronome: 'off',
		metronomeFrequency: 0.05,
		alternateRotationEvery: '',
		exitAfter: '',
		fullscreen: 'on'
	};
	// settings
	var settings = {
		compute: {
			isFullscreen: function() {
				return (document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement);
			},
			isFullscreenAvailable: function() {
				return (canvas.requestFullscreen || canvas.webkitRequestFullScreen || canvas.mozRequestFullScreen || canvas.msRequestFullscreen);
			},
			canvasRadius: function() {
				return Math.min(canvas.width, canvas.height) / 2; // do not factor in setting for canvas size
			}
		},
		computed: {} // computed settings placeholder (allows calling frequently without recalculating)
	};
	// runtime/state variables
	var runtime = {
		timeStarted: 0,
		timeEnded: 0,
		timeLastFrameDrawn: null,
		timeSinceLastFrameDrawn: null,
		itemAngleActual: 0,
		itemAngleRounded: 0,
		lastItemAngleRounded: 0,
		playNoteHandle: null,
		previousNoteIndex: 0,
		currentNoteIndex: 0,
		isDrawing: false,
		isPlaying: false,
		alternateRotationEveryHandle: null,
		exitAfterHandle: null,
		renderTextUntil: 0,
		items: []
	};

	// compute constants
	constants.computed.noteElements = {};
	$('audio[data-note]').each(function() {
		var $this = $(this);
		constants.computed.noteElements[$this.attr('data-note')] = $this[0];
	});
	// add cookie support to constants
	Cookies.set('testCookieSupport', 'yes'); // set test cookie
	if (Cookies.get('testCookieSupport') == 'yes') { // try to read test cookie
		// if support exists, set on
		constants.computed.cookieSupport = true;
		Cookies.remove('testCookieSupport'); // remove test cookie
	} else {
		// if support does not exist, set off
		constants.computed.cookieSupport = false;
	}

	// canvas and context
	var canvas = document.getElementById('app-canvas');
	var context = canvas.getContext('2d');

	// call resize
	resizeCanvas();
	// check if fullscreen is available
	if (!settings.compute.isFullscreenAvailable()) {
		// if no, remove fullscreen option
		defaults.fullscreen = 'off';
		$('#settings-fullscreen').val('off');
		$('#settings-fullscreen option[value=off]').html('Off - Not available in this browser');
		$('#settings-fullscreen').prop('disabled', true);
	}

	// popup explanations
	$('a[data-popup]').on('click', function() {
		var $this = $(this);
		// set title
		$('#modal-popup .modal-title').html($this.parent().html().replace(/(<([^>]+)>)/ig, '').replace('(?)', '')); // strip tags and link
		// set text
		$('#modal-popup .modal-body p').html($this.attr('data-popup'));
		// show modal
		$('#modal-popup').modal();
		return false;
	});

	// disclaimer button
	$('#disclaimer-button').on('click', function() {
		// hide disclaimer panel
		$('#disclaimer-panel').hide();
		// show settings panel
		$('#settings-panel').show();
		// scroll to top
		scrollToTop();
	});

	// settings run button
	$('#settings-run-button').on('click', function() {
		// save settings
		settings.type = $('#settings-type').val();
		settings.direction = $('#settings-direction').val();
		settings.items = parseInt($('#settings-items').val());
		settings.rotationSpeed = parseInt($('#settings-rotation-speed').val());
		settings.peakVelocity = parseInt($('#settings-peak-velocity').val());
		settings.rotationFrequency = parseFloat($('#settings-rotation-frequency').val());
		settings.itemSize = parseFloat($('#settings-item-size').val());
		settings.screenSize = parseFloat($('#settings-screen-size').val());
		settings.screenPosition = parseFloat($('#settings-screen-position').val());
		settings.foregroundColor = $('#settings-color-foreground').spectrum('get').toHexString();
		settings.backgroundColor = $('#settings-color-background').spectrum('get').toHexString();
		settings.metronome = ($('#settings-metronome').val() == 'on');
		settings.metronomeFrequency = parseFloat($('#settings-metronome-frequency').val());
		settings.alternateRotationEvery = parseInt($('#settings-alternate-rotation-every').val());
		settings.exitAfter = parseInt($('#settings-exit-after').val());
		settings.fullscreen = ($('#settings-fullscreen').val() == 'on');
		// update saved settings
		updateSavedSettings();
		// compute settings
		computeSettings();
		// apply settings
		runtime.timeStarted = Date.now();
		runtime.timeEnded = null;
		runtime.itemAngleActual = 0;
		runtime.itemAngleRounded = 0;
		runtime.lastItemAngleRounded = -1;
		// generate item positions using Vogel's Approximation Method of Allocation with brute force entropy offsets, assuming a max size
		runtime.items = [];
		var radiusOfMaxSizeItem = constants.itemCalculationScreenRadius * (settings.itemSize / 100);
		var radiusOfMaxSize = constants.itemCalculationScreenRadius - radiusOfMaxSizeItem;
		var spaceOfMaxSize = Math.max(constants.itemCalculationScreenRadius * constants.itemSpaceMultiplier, 1);
		var ratio = Math.PI * (3 - Math.sqrt(5));
		for (var itemIndex = 1; itemIndex < settings.items; itemIndex++) {
			var theta = itemIndex * ratio;
			var radiusRatio = Math.sqrt(itemIndex) / Math.sqrt(settings.items);
			var maxItemEntropyForCalculation = radiusOfMaxSizeItem * constants.itemMaxEntropyMultiplier;
			var maxItemEntropy = maxItemEntropyForCalculation * constants.itemPercentOfEntropyStrength + maxItemEntropyForCalculation * (1 - constants.itemPercentOfEntropyStrength) * Math.sqrt(1 - radiusRatio); // vary the max entropy in the calculation when item is close to center based on entropy strength percent
			for (var numberOfAttempts = 1; numberOfAttempts <= constants.itemEntropyMaxAttempts; numberOfAttempts++) {
				// require that item does not overlap with center item
				var doesItemOverlapWithCenterItem = true;
				while (doesItemOverlapWithCenterItem) {
					// compute entropy
					var entropyX = -maxItemEntropy / 2 + Math.random() * maxItemEntropy;
					var entropyY = -maxItemEntropy / 2 + Math.random() * maxItemEntropy;
					// compute potential coordinates
					var x = Math.cos(theta) * radiusRatio * (radiusOfMaxSize - maxItemEntropyForCalculation) + entropyX;
					var y = Math.sin(theta) * radiusRatio * (radiusOfMaxSize - maxItemEntropyForCalculation) + entropyY;
					// update overlap with center item
					doesItemOverlapWithCenterItem = (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) <= radiusOfMaxSizeItem * 2 + spaceOfMaxSize);
				}
				// check whether item overlaps with other items
				var doesItemOverlapWithOtherItems = false;
				for (var existingItemIndex = 0; existingItemIndex < runtime.items.length; existingItemIndex++) {
					var existingItem = runtime.items[existingItemIndex];
					if (Math.sqrt(Math.pow(existingItem.x - x, 2) + Math.pow(existingItem.y - y, 2)) <= radiusOfMaxSizeItem * 2 + spaceOfMaxSize) {
						doesItemOverlapWithOtherItems = true;
						break;
					}
				}
				if (!doesItemOverlapWithOtherItems || numberOfAttempts == constants.itemEntropyMaxAttempts) {
					// if no or max attempts reached, add item and exit
					runtime.items.push({
						x: x,
						y: y
					});
					break;
				}
			}
		}
		// enable metronome if on
		if (settings.metronome) {
			// set note handle
			runtime.playNoteHandle = setInterval(playNextNote, settings.computed.noteSeconds * 1000);
			// reset note indexes
			runtime.currentNoteIndex = 0;
			runtime.previousNoteIndex = -1;
			// set playing
			runtime.isPlaying = true;
			// loop through all audio
			for (var note in constants.computed.noteElements) {
				// quickly toggle each on and off
				var noteElement = constants.computed.noteElements[note];
				noteElement.play();
				noteElement.pause();
			}
		}
		// set alternate rotation every
		if (settings.alternateRotationEvery > 0) {
			runtime.alternateRotationEveryHandle = setInterval(reverseDirection, settings.alternateRotationEvery * 1000);
		}
		// set exit after
		if (settings.exitAfter > 0) {
			runtime.exitAfterHandle = setTimeout(returnToSettings, settings.exitAfter * 1000);
		}
		// start fullscreen if available
		if (settings.compute.isFullscreenAvailable() && settings.fullscreen) {
			if (canvas.requestFullScreen) {
				canvas.requestFullScreen();
			} else if (canvas.webkitRequestFullScreen) {
				canvas.webkitRequestFullScreen();
			} else if (canvas.mozRequestFullScreen) {
				canvas.mozRequestFullScreen();
			} else if (canvas.msRequestFullscreen) {
				canvas.msRequestFullscreen();
			}
		}
		// hide settings panel
		$('.container').hide();
		// show app panel
		$('#app-panel').show();
		// scroll to top
		scrollToTop();
		// start first animation frame
		runtime.isDrawing = true;
		window.requestAnimationFrame(draw);
		// play first note if metronome is on
		if (settings.metronome) {
			playNextNote();
		}
	});

	// settings reset button
	$('#settings-reset-button').on('click', function() {
		// reset defaults
		resetDefaults();
		// update saved settings
		updateSavedSettings();
	});

	// app panel
	$('#app-panel').on('click', returnToSettings); // return to settings
	// keypress
	$(document).on('keydown', function(e) {
		// only when drawing
		if (runtime.isDrawing) {
			var multiplier;
			switch (e.keyCode) {
				case 37:
				case 39:
					// left or right
					multiplier = (e.keyCode == 39 ? 1 : -1);
					// update rotation
					settings.rotationSpeed += constants.speedChange * multiplier;
					if (settings.rotationSpeed >= 360) {
						settings.rotationSpeed = 360;
					}
					else if (settings.rotationSpeed < -360) {
						settings.rotationSpeed = -360;
					}
					settings.peakVelocity += constants.speedChange * multiplier;
					if (settings.peakVelocity >= 360) {
						settings.peakVelocity = 360;
					}
					else if (settings.peakVelocity < -360) {
						settings.peakVelocity = -360;
					}
					// recompute settings
					computeSettings();
					// render text
					runtime.renderTextUntil = Date.now() + constants.renderTextForSeconds * 1000;
					break;
				case 38:
				case 40:
					// up or down
					multiplier = (e.keyCode == 38 ? 1 : -1);
					// update size
					settings.screenSize += constants.screenSizeChange * multiplier;
					if (settings.screenSize >= 100) {
						settings.screenSize = 100;
					}
					else if (settings.screenSize < 0.1) {
						settings.screenSize = 0.1;
					}
					// recompute settings
					computeSettings();
					// render text
					runtime.renderTextUntil = Date.now() + constants.renderTextForSeconds * 1000;
					break;
				case 81:
				case 65:
					// q or a
					multiplier = (e.keyCode == 81 ? 1 : -1);
					// update position
					settings.screenPosition += constants.screenPositionChange * multiplier;
					if (settings.screenPosition >= 100) {
						settings.screenPosition = 100;
					}
					else if (settings.screenPosition < -100) {
						settings.screenPosition = -100;
					}
					// recompute settings
					computeSettings();
					// render text
					runtime.renderTextUntil = Date.now() + constants.renderTextForSeconds * 1000;
					break;
				case 90:
					// z
					// reverse direction
					reverseDirection();
					// recompute settings
					computeSettings();
					break;
				default:
					// all other keys
					// check if app panel is visible
					if ($('#app-panel').is(':visible')) {
						// if yes, return to settings
						returnToSettings();
					}
					break;
			}
		}
	});

	// resize canvas to full screen
	function resizeCanvas() {
		// get window size
		var windowWidth = $(window).innerWidth();
		var windowHeight = $(window).innerHeight();
		// track if changed
		var hasChanged = false;
		if (canvas.width != windowWidth) {
			// update width on change
			canvas.setAttribute('width', parseInt(windowWidth));
			hasChanged = true;
		}
		if (canvas.height != windowHeight) {
			// update height on change
			hasChanged = true;
			canvas.setAttribute('height', parseInt(windowHeight));
		}
		// update computed settings on change
		if (hasChanged) {
			computeSettings();
		}
	}
	$(window).on('resize', resizeCanvas);

	// when metronome changed
	$('#settings-metronome').on('change', function() {
		var $this = $(this);
		// enable or disable metronome frequency based on whether metronome is on
		var isMetronomeOn = ($this.val() == 'on');
		$('#settings-metronome-frequency').prop('disabled', !isMetronomeOn);
	});

	// when type changed
	$('#settings-type').on('change', function() {
		var $this = $(this);
		// enable or disable speed options based on whether type is linear
		var isTypeLinear = ($this.val() == 'linear');
		$('#settings-rotation-speed').prop('disabled', !isTypeLinear);
		$('#settings-alternate-rotation-every').prop('disabled', !isTypeLinear);
		$('#settings-peak-velocity').prop('disabled', isTypeLinear);
		$('#settings-rotation-frequency').prop('disabled', isTypeLinear);
	});

	// when fullscreen changed
	$(document).bind('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', function() {
		// check if fullscreen turned off and app running
		if (!settings.compute.isFullscreen() && $('#app-panel').is(':visible')) {
			// if yes, return to settings
			returnToSettings();
		}
	});

	// enforce integer-only inputs
	$('.integers-only').on('blur', function() {
		var $this = $(this);
		var cleanVal = $this.val().replace(/[^0-9\-]/g, '');
		cleanVal = parseInt(cleanVal);
		// only allow negative values for some settings
		switch ($this.attr('id')) {
			default:
				cleanVal = Math.abs(cleanVal);
				break;
		}
		// apply minimum and maximum limits
		switch ($this.attr('id')) {
			case 'settings-items':
				if (cleanVal > 1000) {
					cleanVal = 1000;
				}
				break;
		}
		// set defaults on error
		if (!cleanVal) {
			switch ($this.attr('id')) {
				case 'settings-direction':
					cleanVal = defaults.direction;
					break;
				case 'settings-items':
					cleanVal = defaults.items;
					break;
				case 'settings-alternate-rotation-every':
					cleanVal = defaults.alternateRotationEvery;
					break;
				case 'settings-exit-after':
					cleanVal = defaults.exitAfter;
					break;
				case 'settings-fullscreen':
					cleanVal = defaults.fullscreen;
					break;
			}
		}
		if ($this.attr('id') == 'settings-alternate-rotation-every' && cleanVal == 0) {
			cleanVal = '';
		}
		if ($this.attr('id') == 'settings-exit-after' && cleanVal == 0) {
			cleanVal = '';
		}
		// apply
		if (cleanVal != $this.val()) {
			$this.val(cleanVal);
		}
	});

	// enforce decimals-only inputs
	$('.decimals-only').on('blur', function() {
		var $this = $(this);
		var cleanVal = $this.val().replace(/[^0-9\.\-]/g, '');
		if (!$.isNumeric(cleanVal)) {
			cleanVal = 0;
		}
		cleanVal = parseFloat(cleanVal);
		// only allow negative values for some settings
		switch ($this.attr('id')) {
			case 'settings-screen-position':
				break;
			default:
				cleanVal = Math.abs(cleanVal);
				break;
		}
		// apply minimum and maximum limits
		switch ($this.attr('id')) {
			case 'settings-rotation-speed':
				if (cleanVal >= 360) {
					cleanVal %= 360;
				}
				break;
			case 'settings-speak-velocity':
				if (cleanVal >= 360) {
					cleanVal %= 360;
				}
				break;
			case 'settings-item-size':
				if (cleanVal > 100) {
					cleanVal = 100;
				}
				break;
			case 'settings-screen-size':
				if (cleanVal > 100) {
					cleanVal = 100;
				}
				else if (cleanVal < 0.1 && cleanVal != 0) {
					cleanVal = 0.1;
				}
				break;
			case 'settings-screen-position':
				if (cleanVal > 100) {
					cleanVal = 100;
				}
				else if (cleanVal < -100) {
					cleanVal = -100;
				}
				break;
		}
		// set defaults on error
		if (!cleanVal) {
			switch ($this.attr('id')) {
				case 'settings-rotation-speed':
					// allow 0
					if (cleanVal != 0) {
						cleanVal = defaults.rotationSpeed;
					}
					break;
				case 'settings-peak-velocity':
					// allow 0
					if (cleanVal != 0) {
						cleanVal = defaults.peakVelocity;
					}
					break;
				case 'settings-rotation-frequency':
					cleanVal = defaults.rotationFrequency;
					break;
				case 'settings-item-size':
					cleanVal = defaults.itemSize;
					break;
				case 'settings-screen-size':
					cleanVal = defaults.screenSize;
					break;
				case 'settings-screen-position':
					cleanVal = defaults.screenPosition;
					break;
				case 'settings-metronome-frequency':
					cleanVal = defaults.metronomeFrequency;
					break;
			}
		}
		// apply
		if (cleanVal != $this.val()) {
			$this.val(cleanVal);
			return false;
		}
	});

	// on rotation frequency update
	$('#settings-rotation-frequency').on('keydown blur', function(e) {
		var $this = $(this);
		var val = parseFloat($this.val());
		// only enforce on blur
		if (e.type == 'blur') {
			// require 1 or less
			if (val > 1.0) {
				$this.val('1');
			}
			// do not allow 0
			else if (val == 0) {
				$this.val(defaults.rotationFrequency);
			}
		}
		$('#settings-rotation-frequency-explanation').html(Math.round(1.0 / parseFloat($this.val()), 5));
	});

	// on metronome frequency update
	$('#settings-metronome-frequency').on('keydown blur', function(e) {
		var $this = $(this);
		var val = parseFloat($this.val());
		// only enforce on blur
		if (e.type == 'blur') {
			// require 1 or less
			if (val > 1.0) {
				$this.val('1');
			}
			// do not allow 0
			else if (val == 0) {
				$this.val(defaults.metronomeFrequency);
			}
		}
		$('#settings-metronome-frequency-explanation').html(Math.round(1.0 / parseFloat($this.val()), 5));
	});

	// draw canvas frame
	function draw() {
		// draw using framerate
		var shouldAlwaysDraw = (!settings.computed.isTypeLinear || Math.round(settings.computed.rotationAnglePerFrame * settings.computed.anglePrecisionRoundingMultiplier) == 0);
		var timeNow = Date.now();
		runtime.timeSinceLastFrameDrawn = timeNow - runtime.timeLastFrameDrawn;
		// only when it is time draw based on the frames per second
		if (shouldAlwaysDraw || runtime.timeSinceLastFrameDrawn > settings.computed.msPerFrame) {
			// set last time frame drawn (doesn't actually have to be drawn below, this is for computing whether to draw)
			runtime.timeLastFrameDrawn = timeNow - (runtime.timeSinceLastFrameDrawn % settings.computed.msPerFrame);
			// only draw if animation has moved
			if (shouldAlwaysDraw || runtime.lastItemAngleRounded != runtime.itemAngleRounded) {
				// save context
				context.save();
				// draw background
				context.fillStyle = settings.backgroundColor;
				context.fillRect(0, 0, canvas.width, canvas.height);
				// set origin to canvas center
				context.translate(canvas.width / 2, canvas.height / 2 + settings.compute.canvasRadius() * settings.computed.screenPositionMultiplier);
				// rotate around canvas center
				context.rotate(runtime.lastItemAngleRounded);
				// draw center item
				context.fillStyle = settings.foregroundColor;
				context.beginPath();
				context.arc(0, 0, settings.computed.itemRadius, 0, Math.PI * 2);
				context.closePath();
				context.fill();
				// draw dots
				for (var itemIndex = 0; itemIndex < runtime.items.length; itemIndex++) {
					var item = runtime.items[itemIndex];
					context.beginPath();
					context.arc(item.x / constants.itemCalculationScreenRadius * settings.compute.canvasRadius() * settings.screenSize / 100, item.y / constants.itemCalculationScreenRadius * settings.compute.canvasRadius() * settings.screenSize / 100, settings.computed.itemRadius, 0, Math.PI * 2);
					context.closePath();
					context.fill();
				}
				// restore context
				context.restore();
				// render text if set
				if (runtime.renderTextUntil >= timeNow) {
					// save context
					context.save();
					// set origin to canvas corner
					context.translate(canvas.width, canvas.height);
					// set font and size
					var fontSize = Math.max(Math.round(settings.computed.itemRadius * 0.75), constants.minFontSize);
					context.font = fontSize + "px serif";
					var indicatorText;
					var measureText;
					// set speed text
					indicatorText = (settings.computed.isTypeLinear ? 'Speed' : 'Peak velocity') + ': ' + (Math.round(settings.computed.speed * 10) / 10) + '°/s';
					measureText = context.measureText(indicatorText);
					// draw speed text
					context.strokeStyle = settings.backgroundColor;
					context.lineWidth = 1;
					context.strokeText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 2.25 - constants.renderTextSpace);
					context.fillStyle = settings.foregroundColor;
					context.fillText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 2.25 - constants.renderTextSpace);
					// set screen size text
					indicatorText = 'Size: ' + settings.screenSize + '%';
					measureText = context.measureText(indicatorText);
					// draw screen size text
					context.strokeStyle = settings.backgroundColor;
					context.lineWidth = 1;
					context.strokeText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 1.25 - constants.renderTextSpace);
					context.fillStyle = settings.foregroundColor;
					context.fillText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 1.25 - constants.renderTextSpace);
					// set screen position text
					indicatorText = 'Position: ' + (settings.screenPosition >= 0 ? '+' : '-') + Math.abs(settings.screenPosition) + '%';
					measureText = context.measureText(indicatorText);
					// draw screen position text
					context.strokeStyle = settings.backgroundColor;
					context.lineWidth = 1;
					context.strokeText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 0.25 - constants.renderTextSpace);
					context.fillStyle = settings.foregroundColor;
					context.fillText(indicatorText, -measureText.width - constants.renderTextSpace, -fontSize * 0.25 - constants.renderTextSpace);
					// restore context
					context.restore();
				}
			}
			// move
			if (settings.computed.isTypeLinear) {
				runtime.itemAngleActual += settings.computed.rotationAnglePerFrame;
			} else {
				runtime.itemAngleActual = (settings.peakVelocity * Math.PI / 180) * Math.sin(Math.PI * 2 / 1000 * (timeNow - runtime.timeStarted) * settings.rotationFrequency) * (settings.computed.isDirectionClockwise ? 1 : -1);
			}
			if (runtime.itemAngleActual >= Math.PI * 2) {
				runtime.itemAngleActual %= Math.PI * 2;
			}
			if (runtime.itemAngleActual <= 0) {
				runtime.itemAngleActual %= -Math.PI * 2;
			}
			// update last
			runtime.lastItemAngleRounded = runtime.itemAngleRounded;
			// round
			runtime.itemAngleRounded = Math.round(runtime.itemAngleActual * settings.computed.anglePrecisionRoundingMultiplier) / settings.computed.anglePrecisionRoundingMultiplier;
		}
		// continue to next animation frame if drawing
		if (runtime.isDrawing) {
			window.requestAnimationFrame(draw);
		}
	}

	// restore default settings on load
	resetDefaults();
	// attempt to load saved settings if they exist
	restoreSavedSettings();

	// helper functions

	// scroll to top smoothly
	function scrollToTop() {
		$('html,body').animate({ scrollTop: 0 }, 'fast');
	}

	// re-compute settings
	function computeSettings() {
		settings.computed = {};
		settings.computed.isTypeLinear = (settings.type == 'linear');
		settings.computed.isDirectionClockwise = (settings.direction == 'clockwise');
		settings.computed.speed = (settings.computed.isTypeLinear ? settings.rotationSpeed : settings.peakVelocity);
		settings.computed.msPerFrame = (1000 / constants.framesPerSecond);
		settings.computed.screenPositionMultiplier = (settings.screenSize / 100 * settings.screenPosition / 100 * 2 * -1);
		settings.computed.screenRadius = (settings.compute.canvasRadius() * settings.screenSize / 100);
		settings.computed.itemRadius = (settings.computed.screenRadius * settings.itemSize / 100);
		settings.computed.anglePrecisionRoundingMultiplier = Math.pow(10, constants.anglePrecisionSignificantDigits);
		settings.computed.rotationAnglePerFrame = Math.round((settings.computed.speed * Math.PI / 180 * 2) / constants.framesPerSecond * (settings.computed.isDirectionClockwise ? 1 : -1) * Math.pow(settings.computed.anglePrecisionRoundingMultiplier, 2)) / Math.pow(settings.computed.anglePrecisionRoundingMultiplier, 2);
		settings.computed.noteSeconds = (1.0 / settings.metronomeFrequency) / parseFloat(constants.notes);
		settings.computed.scaleSeconds = (1.0 / settings.metronomeFrequency);
	}

	// update saved settings
	function updateSavedSettings() {
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.type', $('#settings-type').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.direction', $('#settings-direction').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationSpeed', $('#settings-rotation-speed').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.peakVelocity', $('#settings-peak-velocity').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationFrequency', $('#settings-rotation-frequency').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.itemSize', $('#settings-item-size').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenSize', $('#settings-screen-size').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenPosition', $('#settings-screen-position').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.items', $('#settings-items').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronome', $('#settings-metronome').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronomeFrequency', $('#settings-metronome-frequency').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.alternateRotationEvery', $('#settings-alternate-rotation-every').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.exitAfter', $('#settings-exit-after').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.fullscreen', $('#settings-fullscreen').val());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.foregroundColor', $('#settings-color-foreground').spectrum('get').toHexString());
		setSavedSetting(constants.cookieOptions.identifier + '.app.settings.backgroundColor', $('#settings-color-background').spectrum('get').toHexString());
	}

	// restore saved settings
	function restoreSavedSettings() {
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.type')) {
			$('#settings-type').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.type'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.direction')) {
			$('#settings-direction').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.direction'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.items')) {
			$('#settings-items').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.items'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationSpeed')) {
			$('#settings-rotation-speed').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationSpeed'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.peakVelocity')) {
			$('#settings-peak-velocity').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.peakVelocity'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationFrequency')) {
			$('#settings-rotation-frequency').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.rotationFrequency'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.itemSize')) {
			$('#settings-item-size').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.itemSize'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenSize')) {
			$('#settings-screen-size').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenSize'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenPosition')) {
			$('#settings-screen-position').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.screenPosition'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronome')) {
			$('#settings-metronome').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronome'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronomeFrequency')) {
			$('#settings-metronome-frequency').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.metronomeFrequency'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.alternateRotationEvery')) {
			$('#settings-alternate-rotation-every').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.alternateRotationEvery'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.exitAfter')) {
			$('#settings-exit-after').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.exitAfter'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.fullscreen')) {
			$('#settings-fullscreen').val(getSavedSetting(constants.cookieOptions.identifier + '.app.settings.fullscreen'));
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.foregroundColor')) {
			$('#settings-color-foreground').spectrum({
				color: getSavedSetting(constants.cookieOptions.identifier + '.app.settings.foregroundColor')
			});
		}
		if (getSavedSetting(constants.cookieOptions.identifier + '.app.settings.backgroundColor')) {
			$('#settings-color-background').spectrum({
				color: getSavedSetting(constants.cookieOptions.identifier + '.app.settings.backgroundColor')
			});
		}
		// update dependent settings elements
		updateDependentSettingsElements();
	}

	// get saved setting
	function getSavedSetting(name) {
		// check if cookies are supported
		if (constants.computed.cookieSupport) {
			// if yes, read and return cookie value
			return Cookies.get(name);
		} else {
			// if no, read and return local storage value
			return localStorage.getItem(name);
		}
	}

	// set saved setting
	function setSavedSetting(name, value) {
		// check if cookies are supported
		if (constants.computed.cookieSupport) {
			// if yes, set cookie value
			Cookies.set(name, value, constants.cookieOptions);
		} else {
			// if no, set local storage value
			localStorage.setItem(name, value);
		}
	}

	// reset defaults
	function resetDefaults() {
		// inputs
		$('#settings-type').val(defaults.type);
		$('#settings-direction').val(defaults.direction);
		$('#settings-items').val(defaults.items);
		$('#settings-rotation-speed').val(defaults.rotationSpeed);
		$('#settings-peak-velocity').val(defaults.peakVelocity);
		$('#settings-rotation-frequency').val(defaults.rotationFrequency);
		$('#settings-item-size').val(defaults.itemSize);
		$('#settings-screen-size').val(defaults.screenSize);
		$('#settings-screen-position').val(defaults.screenPosition);
		$('#settings-metronome').val(defaults.metronome);
		$('#settings-metronome-frequency').val(defaults.metronomeFrequency);
		$('#settings-alternate-rotation-every').val(defaults.alternateRotationEvery);
		$('#settings-exit-after').val(defaults.exitAfter);
		$('#settings-fullscreen').val(defaults.fullscreen);
		// color pickers
		$('#settings-color-foreground').spectrum({
			color: defaults.foregroundColor
		});
		$('#settings-color-background').spectrum({
			color: defaults.backgroundColor
		});
		// update dependent settings elements
		updateDependentSettingsElements();
	}

	// update dependent settings elements
	function updateDependentSettingsElements() {
		$('#settings-metronome').trigger('change');
		$('#settings-metronome-frequency').trigger('blur');
		$('#settings-type').trigger('change');
		$('#settings-rotation-frequency').trigger('blur');
	}

	// exit app and return to settings
	function returnToSettings() {
		// set time ended
		runtime.timeEnded = Date.now();
		// clear alternate every handle
		if (runtime.alternateRotationEveryHandle !== null) {
			clearInterval(runtime.alternateRotationEveryHandle);
			runtime.alternateRotationEveryHandle = null;
		}
		// clear exit after handle
		if (runtime.exitAfterHandle !== null) {
			clearTimeout(runtime.exitAfterHandle);
			runtime.exitAfterHandle = null;
		}
		// check if fullscreen
		if (settings.compute.isFullscreenAvailable() && settings.compute.isFullscreen()) {
			// if yes, stop fullscreen
			if (document.fullScreenElement) {
				document.cancelFullScreen();
			} else if (document.webkitIsFullScreen) {
				document.webkitCancelFullScreen();
			} else if (document.mozFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.msFullscreenElement) {
				document.msExitFullscreen();
			}
		}
		// disable metronome if set
		if (settings.metronome) {
			// clear play note handle
			clearInterval(runtime.playNoteHandle);
			runtime.playNoteHandle = null;
		}
		// unset drawing
		runtime.isDrawing = false;
		// unset playing
		runtime.isPlaying = false;
		// hide app panel
		$('#app-panel').hide();
		// show settings panel
		$('.container').show();
		// scroll to top
		scrollToTop();
	}

	// reverse direction
	function reverseDirection() {
		// only for linear type
		if (settings.computed.isTypeLinear) {
			// set direction to opposite value
			settings.direction = (settings.direction == 'clockwise' ? 'counterclockwise' : 'clockwise');
			// recompute settings
			computeSettings();
		}
	}

	// play next note
	function playNextNote() {
		// stop previous note and rewind if playing
		var previousNote = noteForIndex(runtime.previousNoteIndex);
		if (previousNote) {
			var previousNoteElement = constants.computed.noteElements[previousNote];
			previousNoteElement.pause();
			previousNoteElement.currentTime = 0;
		}
		// reset and play current note
		var currentNote = noteForIndex(runtime.currentNoteIndex);
		var currentNoteElement = constants.computed.noteElements[currentNote];
		currentNoteElement.play();
		// update previous note index
		runtime.previousNoteIndex = runtime.currentNoteIndex;
		// increment note index
		runtime.currentNoteIndex++;
		if (runtime.currentNoteIndex == constants.notes) {
			runtime.currentNoteIndex = 0;
		}
	}

	// get note based on index
	function noteForIndex(noteIndex) {
		// write out each note for clarity
		switch (noteIndex) {
			case 0:
				return 'c1';
			case 1:
				return 'd1';
			case 2:
				return 'e1';
			case 3:
				return 'f1';
			case 4:
				return 'g1';
			case 5:
				return 'a1';
			case 6:
				return 'b1';
			case 7:
				return 'c2';
			case 8:
				return 'b1';
			case 9:
				return 'a1';
			case 10:
				return 'g1';
			case 11:
				return 'f1';
			case 12:
				return 'e1';
			case 13:
				return 'd1';
			default:
				return null;
		}
	}

});