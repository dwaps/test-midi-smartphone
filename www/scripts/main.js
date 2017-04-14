var webMIDI = (function(){

	'use strict';

	window.audioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext);

	const keyHolder = document.querySelector('#keys');
	const enableMIDIBtn = document.querySelector('#askForMIDI');

	const canvas = document.querySelector('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	
	const audioContext = new window.AudioContext();

	const midiNotes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];

	const keys = Array.from(document.querySelectorAll('#keys span'));
	const colors = [ 
		'#E50000', '#E23800', '#DF6F00', '#DCA500', '#DAD900', 
		'#A2D700', '#68D400', '#35D200', '#00CF00', '#00CC32',
		'#00C963', '#00C794', '#00C4C3', '#0092C1', '#0060BF'
	];
	const canvasOffsets = keys.map(key => {
		return (key.offsetLeft - keyHolder.offsetLeft) + (key.offsetWidth / 2);
	});
	
	const shineImage = document.querySelector('img');
	const beamWidth = 30;
	var noteLines = [];
	const lineSpeed = 5;

	keys.forEach( (key, idx) => {
		key.style.backgroundColor = colors[idx];
	});

	const soundSamplePaths = keys.map( (key, idx) => {
		return `/assets/sounds/${idx + 1}.wav`;	
	});

	var soundBuffers = undefined;

	function drawKeyboardBars(){

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		noteLines.forEach(line => {
			const offset = canvasOffsets[line.idx];
			ctx.fillStyle = colors[line.idx];
			ctx.fillRect(offset - (beamWidth / 2), line.position, beamWidth, line.height);

			if(line.on){
				line.height += lineSpeed;
				line.position -= lineSpeed;
				ctx.drawImage(shineImage, offset - (shineImage.width / 2), canvas.height - shineImage.height);
			} else {
				line.position -= lineSpeed;
			}

		});

		noteLines = noteLines.filter(line => {
			return line.position + line.height > 0;
		});

		requestAnimationFrame(drawKeyboardBars);

	}

	function MIDIenabled(MIDI){
		console.log('MIDI Allowed');
		enableMIDIBtn.dataset.visible = "false";

		const devices = MIDI.inputs.values();
		for (var device = devices.next(); device && !device.done; device = devices.next()) {
			device.value.onmidimessage = function(msg){

				const isOn = msg.data[0] === 144;
				const midiNote = msg.data[1];
				const noteIndex = midiNotes.indexOf(midiNote)
				const keySlot = keys[noteIndex];

				if(isOn){
					playNote(soundBuffers[noteIndex]);
					noteLines.push({
						on : true,
						idx : noteIndex,
						height : lineSpeed,
						position : canvas.height
					});
				} else {

					noteLines.forEach(line => {
						if(line.idx === noteIndex){
							line.on = false;
						}
					});

				}

				keySlot.dataset.pressed = isOn;

			};

		}

	}

	function MIDIdenied(){
		console.log('MIDI not Allowed');
		alert('You need to allow MIDI access to play this instrument!');
	}

	function playNote(sample){

		var src = audioContext.createBufferSource(),
			newBuffer = cloneAudioBuffer(sample, audioContext);

		src.buffer = newBuffer;

		var gainNode = audioContext.createGain();
		
		gainNode.gain.value = 1;

		src.connect(gainNode);
		gainNode.connect(audioContext.destination);

		src.start(0);
	}

	new Promise( function(resolve){

			new BufferLoader(audioContext, soundSamplePaths, (samples) => {	
				console.log(samples)
				soundBuffers = samples;
				resolve();
			}).load();

		})
		.then(function(){

			enableMIDIBtn.dataset.visible = 'true';
			enableMIDIBtn.addEventListener('click', function(){

				navigator.requestMIDIAccess().then( MIDIenabled, MIDIdenied );
				drawKeyboardBars();

			}, false);

			console.log("WebMIDI app initialised");
		})
	;

}());