class MpuState {
    constructor(q0, q1, q2, q3, maxAcceleration, timestamp) {
      this.q0 = q0;
      this.q1 = q1;
      this.q2 = q2;
      this.q3 = q3;
      this.maxAcceleration = maxAcceleration;
      this.timestamp = timestamp;
    }
}
  
module.exports = MpuState;