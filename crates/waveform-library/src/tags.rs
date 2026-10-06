use std::path::Path;

use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::Accessor;

/// Title and artist read from a file's tags. Nothing, when the file has none.
pub fn read_tags(path: &Path) -> Option<(String, String)> {
    let tagged = Probe::open(path).ok()?.read().ok()?;
    let tag = tagged.primary_tag()?;
    let title = tag.title().map(std::borrow::Cow::into_owned);
    let artist = tag.artist().map(std::borrow::Cow::into_owned);
    if title.is_none() && artist.is_none() {
        return None;
    }
    Some((title.unwrap_or_default(), artist.unwrap_or_default()))
}
