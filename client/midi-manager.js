class WebMidiManager {

    constructor(parameters = {}) {
        this.midiAccess = undefined;
        this.inputStatus = new ReactiveVar('unloaded');
        this.inputLevel = new ReactiveVar(0);
        this.activeInputs = new ReactiveArray();
        this.activeOutputs = new ReactiveArray();
    }

  /*
   * public API functions
   * --------------------
   */
  get() {
      return this;
  }

  _start() {

  }

  _stop() {
      this._closeInputPorts();
  }

  _loadSource() {
      if (!this.midiAccess) {
          // new midiAccess (only executed once)
          this._requestMidiAccess();
      }
  }

  _unloadSource() {
      this._closeInputPorts();
      this.inputStatus.set('unloaded');
  }

  /*
   * private functions
   * -----------------
   */
  _requestMidiAccess() {
      var self = this;

      if (navigator.requestMIDIAccess !== undefined) {
          this.inputStatus.set('loading');
          self.midiPromise = navigator.requestMIDIAccess();
          self.midiPromise.then( self._onMidiRequestSuccess.bind(self), self._onMidiFail.bind(self) );
      } else {
          console.log(3, 'No access to MIDI devices: browser does not support WebMIDI API, please install the Jazz plugin');
          this.inputStatus.set('rejected'); // or noSource?
      }
  }

  _onMidiRequestSuccess(midiAccess) {

      // reference midiAccess for later use
      this.midiAccess = midiAccess;

      // hook up handler for onstatechange event
      this.midiAccess.onstatechange = this._onstatechangeHandler.bind(this);

      // set micStatus to ready if at least one midi input is available

      this._updateActiveInputs();
  }

  _onMidiFail(error) {
      this.inputStatus.set('rejected');
  }

  _updateActiveInputs() {
      this.activeInputs.curValue.length = 0;

      this.midiAccess.inputs.forEach((inputPort) => {
          if (!inputPort.inputLevel) inputPort.inputLevel = new ReactiveVar(0);
          if (!inputPort.onmidimessage) inputPort.onmidimessage = this._midiMessageHandler.bind(this);
          this.activeInputs.push(inputPort);
      });

      if (this.midiAccess.inputs.size > 0) {
          this.inputStatus.set('ready');
      } else {
          this.inputStatus.set('noSource');
      }

      this.activeInputs.dep.changed();
  }

  _closeInputPorts() {

      if (this.midiAccess) {
          this.midiAccess.inputs.forEach(function(midiInputPort) {
              midiInputPort.close();
          });
      }
  }

  _midiMessageHandler(msg) {
      console.log(1, '[MidiManager] got midimessage: ', msg);

      // get velocity
      let velocity = 0;
      let percentage;
      if (msg.data.length > 2) { // apparently it can happen that msg.data has just two elements
          velocity = msg.data[2];
      }

      var note = msg.data[1];
      // get command type (noteOn or noteOff)
      let cmd = msg.data[0] >> 4;
      var noteOn;

      // set inputLevel for player UI
      if ((cmd == 8) || ((cmd == 9) && (velocity == 0))) {
          //noteOff: set to 0
          percentage = this._velocityToPercentage(0);
          noteOn = false;
      } else if (cmd == 9) {
          //noteOn: calculate percentage and set that value
          percentage = this._velocityToPercentage(velocity);
          noteOn = true;
      }

      midiSound.play(note, velocity, noteOn);

      if (percentage) {
          this.inputLevel.set(percentage);
          if (msg.target && msg.target.inputLevel) msg.target.inputLevel.set(percentage);
      }
  }

  _velocityToPercentage(velocity) {
      let value = velocity / 127;
      return Math.max(0.1, value);
  }

  _onstatechangeHandler(e) {

      let port = e.port;

      this._handleStateOf(port);
      this._handleConnectionOf(port);

      // time out is needed to make sure events are processed by browser
      setTimeout(() => {
          this._updateActiveInputs();
      }, 0)
  }

  _handleConnectionOf(port) {

      if (port.connection === 'open') {
          console.log(1, '[WebmidiManager] midi port is open ', port);
      } else if (port.connection === 'closed') {
          console.log(1, '[WebmidiManager] Midi Port is closed', port);
      }
  }

  _handleStateOf(port) {

      if (port.state === 'disconnected') {
          port.close();
      } else if (port.state === 'connected') {
          if (port.type === 'input') {
              port.open();
          }
      } else {
          console.log(2, 'not handled port.state: ' + port.state);
      }
  }
}

midiManager = new WebMidiManager();



// counter starts at 0
Session.setDefault('counter', 0);

Template.main.onRendered(function(){
  midiManager._loadSource();
})
Template.main.helpers({
  devices: function () {
    return midiManager.activeInputs.get();
  },
  getInput: function(device){
    return device.inputLevel.get();
  }
});

Template.hello.helpers({
  counter: function () {
    return Session.get('counter');
  }
});

Template.hello.events({
  'click button': function () {
    // increment the counter when button is clicked
    Session.set('counter', Session.get('counter') + 1);
    midiSound.load();
  }
});

