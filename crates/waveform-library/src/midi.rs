/// A three-byte MIDI channel message. System exclusive is ignored.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MidiMessage {
    pub status: u8,
    pub data1: u8,
    pub data2: u8,
}

/// Parses one channel voice message. Returns nothing for a short or non-channel buffer.
pub fn parse_midi(bytes: &[u8]) -> Option<MidiMessage> {
    let status = *bytes.first()?;
    if !(0x80..0xF0).contains(&status) || bytes.len() < 3 {
        return None;
    }
    Some(MidiMessage {
        status,
        data1: bytes[1],
        data2: bytes[2],
    })
}

/// The command id for a message the engine also handles in real time.
/// CC 1 is the crossfader. A note-on starts the sampler.
pub fn command_for_midi(message: MidiMessage) -> Option<&'static str> {
    match message.status & 0xF0 {
        0xB0 if message.data1 == 1 => Some("mixer.crossfader"),
        0x90 if message.data2 > 0 => Some("sampler.trigger"),
        _ => None,
    }
}
