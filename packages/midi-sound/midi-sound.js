MidiSound = class MidiSound{
	load(){

	}

	destroy(){

	}

	play(note, velocity, noteOn){
		// console.log('PLAY SOUND', midiMessage);

		// var delay = 0; // play one note every quarter second			var delay = 0; // play one note every quarter second
		// var note = 50; // the MIDI note
		// var velocity = 127; // how hard the note hits
		// play the note
		MIDI.setVolume(0, velocity);
		if(noteOn) MIDI.noteOn(0, note, velocity, 0);
		else MIDI.noteOff(0, note, 0);
	}
}

Meteor.startup(function(){
	MIDI.loadPlugin({
		soundfontUrl: "./packages/midi-sound/soundfont/",
		instrument: "acoustic_grand_piano",
		onprogress: function(state, progress) {
			console.log(state, progress);
		},
		onsuccess: function() {

			console.log('SUCCESS', MIDI)

			

		}
	});
})