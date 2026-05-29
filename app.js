  const bandSearchInput = document.getElementById("bandSearchInput");
  const bandSearchBtn = document.getElementById("bandSearchBtn");
  const searchStatus = document.getElementById("searchStatus");
  const albumName = document.querySelector(".album-name");
  const albumSub = document.querySelector(".album-sub em");
  const albumCover = document.querySelector(".album-cover");
  const coverTitle = document.querySelector(".cover-title");
  const coverPlease = document.querySelector(".please");
  const coverPleaseMe = document.querySelector(".please-me");
  const coverWithLove = document.querySelector(".with-love");
  const factLabel1 = document.getElementById("factLabel1");
  const factLabel3 = document.getElementById("factLabel3");
  const factValue1 = document.getElementById("factValue1");
  const factValue2 = document.getElementById("factValue2");
  const factValue3 = document.getElementById("factValue3");
  const factValue4 = document.getElementById("factValue4");
  const essentialTracksList = document.querySelector(".essential-tracks ol");
  const essentialInfoList = document.getElementById("essentialInfoList");
  const keyContextList = document.getElementById("keyContextList");
  const watchPerformanceLink = document.getElementById("watchPerformanceLink");
  const nextCovers = document.getElementById("nextCovers");
  const timelineTrack = document.getElementById("timelineTrack");
  const influenceList = document.getElementById("influenceList");
  const contributorsList = document.getElementById("contributorsList");
  const livePhoto = document.getElementById("livePhoto");
  const liveDocHeading = document.getElementById("liveDocHeading");
  const liveDocBlurb = document.getElementById("liveDocBlurb");

  function formatLifeSpan(lifeSpan) {
    if (!lifeSpan) return "Unknown";
    const start = lifeSpan.begin || "Unknown";
    const end = lifeSpan.ended ? (lifeSpan.end || "Present") : "Present";
    return start + " - " + end;
  }

  function toTitleCase(text) {
    if (!text) return "Unknown";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatDate(dateText) {
    if (!dateText) return "Unknown";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      const date = new Date(dateText + "T00:00:00");
      return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
    return dateText;
  }

  function splitTitleForCover(title) {
    if (!title) {
      return { line1: "NO", line2: "TITLE" };
    }

    const words = title.toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return { line1: words[0], line2: "" };
    }
    const midpoint = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, midpoint).join(" "),
      line2: words.slice(midpoint).join(" ")
    };
  }

  async function canLoadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  let mbLastRequestAt = 0;

  async function mbFetch(url) {
    const waitMs = Math.max(0, 1100 - (Date.now() - mbLastRequestAt));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    mbLastRequestAt = Date.now();
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error("MusicBrainz request failed (" + res.status + ").");
    }

    return res.json();
  }

  function parseAlbumReleaseGroups(data) {
    const groups = (data["release-groups"] || []).filter((group) => group["primary-type"] === "Album");
    groups.sort((a, b) => (a["first-release-date"] || "9999").localeCompare(b["first-release-date"] || "9999"));
    return groups;
  }

  async function fetchArtistByName(name) {
    const query = encodeURIComponent('artist:"' + name + '"');
    const searchUrl = "https://musicbrainz.org/ws/2/artist/?query=" + query + "&fmt=json&limit=5";
    const searchData = await mbFetch(searchUrl);
    const artists = searchData.artists || [];
    if (!artists.length) {
      return null;
    }

    // Prefer exact (case-insensitive) name match; otherwise use first result.
    const exact = artists.find((artist) => artist.name.toLowerCase() === name.toLowerCase());
    return exact || artists[0];
  }

  async function fetchArtistDetails(mbid) {
    const detailsUrl = "https://musicbrainz.org/ws/2/artist/" + mbid + "?fmt=json&inc=tags+genres+url-rels+artist-rels+release-groups";
    return mbFetch(detailsUrl);
  }

  function extractYear(dateText) {
    if (!dateText) return "—";
    const match = String(dateText).match(/^(\d{4})/);
    return match ? match[1] : "—";
  }

  function splitLabelLines(text) {
    if (!text) return ["Unknown album"];
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 3) return [text];
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
  }

  function pickTimelineAlbums(releaseGroups, featuredGroupId, maxItems) {
    const limit = maxItems || 6;
    const sorted = [...(releaseGroups || [])].sort((a, b) =>
      (a["first-release-date"] || "9999").localeCompare(b["first-release-date"] || "9999")
    );

    if (sorted.length <= limit) {
      return sorted;
    }

    const featuredIndex = sorted.findIndex((group) => group.id === featuredGroupId);
    if (featuredIndex === -1) {
      return sorted.slice(0, limit);
    }

    let start = Math.max(0, featuredIndex - Math.floor(limit / 2));
    let end = start + limit;
    if (end > sorted.length) {
      end = sorted.length;
      start = Math.max(0, end - limit);
    }
    return sorted.slice(start, end);
  }

  function renderTimeline(releaseGroups, featuredGroupId) {
    if (!timelineTrack) {
      return;
    }

    timelineTrack.innerHTML = "";
    const albums = pickTimelineAlbums(releaseGroups, featuredGroupId, 6);

    if (!albums.length) {
      const empty = document.createElement("p");
      empty.className = "timeline-empty";
      empty.textContent = "No album timeline available for this artist.";
      timelineTrack.appendChild(empty);
      timelineTrack.style.gridTemplateColumns = "";
      return;
    }

    timelineTrack.style.gridTemplateColumns = "repeat(" + albums.length + ", 1fr)";

    for (const album of albums) {
      const item = document.createElement("div");
      item.className = "tl-item";
      if (album.id === featuredGroupId) {
        item.classList.add("active");
      }

      const year = document.createElement("div");
      year.className = "tl-year";
      year.textContent = extractYear(album["first-release-date"]);

      const dot = document.createElement("div");
      dot.className = "tl-dot";

      const label = document.createElement("div");
      label.className = "tl-label";
      const lines = splitLabelLines(album.title);
      label.innerHTML = lines.join("<br>");

      item.appendChild(year);
      item.appendChild(dot);
      item.appendChild(label);
      timelineTrack.appendChild(item);
    }
  }

  function buildYouTubeSearchUrl(query) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
  }

  async function fetchAlbumReleaseGroups(artistId) {
    const url = "https://musicbrainz.org/ws/2/release-group?artist=" + artistId + "&type=album&fmt=json&limit=25";
    const data = await mbFetch(url);
    return parseAlbumReleaseGroups(data);
  }

  async function fetchTopReleaseGroup(artistId) {
    const groups = await fetchAlbumReleaseGroups(artistId);
    return groups.length ? groups[0] : null;
  }

  async function fetchReleaseForGroup(releaseGroupId) {
    const url = "https://musicbrainz.org/ws/2/release?release-group=" + releaseGroupId + "&fmt=json&inc=labels&limit=25";
    const data = await mbFetch(url);
    const releases = data.releases || [];
    if (!releases.length) return null;

    releases.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    return releases[0];
  }

  async function fetchReleaseRelations(releaseId) {
    // Producer/engineer credits usually live on the individual recordings, so pull
    // release-level and recording-level artist relations in a single request.
    const url = "https://musicbrainz.org/ws/2/release/" + releaseId + "?fmt=json&inc=recordings+artist-rels+recording-level-rels";
    const data = await mbFetch(url);
    const relations = [...(data.relations || [])];

    for (const disc of data.media || []) {
      for (const track of disc.tracks || []) {
        for (const relation of track.recording?.relations || []) {
          relations.push(relation);
        }
      }
    }

    return relations;
  }

  async function fetchReleaseTracklist(releaseId) {
    const url = "https://musicbrainz.org/ws/2/release/" + releaseId + "?fmt=json&inc=recordings";
    const data = await mbFetch(url);
    const media = data.media || [];
    const trackNames = [];

    for (const disc of media) {
      const tracks = disc.tracks || [];
      for (const track of tracks) {
        const title = track.title || track.recording?.title;
        if (title) {
          trackNames.push(title);
        }
      }
    }

    return trackNames;
  }

  async function resolveCoverUrl(releaseId, releaseGroupId) {
    const candidates = [
      "https://coverartarchive.org/release/" + releaseId + "/front-500",
      "https://coverartarchive.org/release-group/" + releaseGroupId + "/front-500"
    ];

    for (const url of candidates) {
      // Try loading the image directly; if it fails, move to next candidate.
      const ok = await canLoadImage(url);
      if (ok) return url;
    }

    return null;
  }

  async function fetchWikipediaPageImages(artistName) {
    const title = encodeURIComponent(artistName.replace(/\s+/g, "_"));
    const url = "https://en.wikipedia.org/w/api.php?action=query&titles=" + title + "&prop=images&imlimit=50&format=json&origin=*";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.images || [];
  }

  async function fetchWikipediaFileImageUrl(fileTitle) {
    const url = "https://en.wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(fileTitle) + "&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const imageInfo = page?.imageinfo?.[0];
    return imageInfo?.thumburl || imageInfo?.url || null;
  }

  function formatLivePhotoCaption(fileTitle) {
    return fileTitle
      .replace(/^File:/i, "")
      .replace(/\.[^.]+$/, "")
      .replace(/_/g, " ");
  }

  async function fetchLiveShowPhoto(artistName, fallbackThumbnail) {
    const livePattern = /live|concert|perform|performance|stage|tour|festival|gig|venue|sullivan/i;
    const skipPattern = /logo|album|cover|single|poster|disc|svg|icon|flag|map|chart|signature|headshot|portrait/i;

    try {
      const images = await fetchWikipediaPageImages(artistName);
      const candidates = images
        .map((image) => image.title)
        .filter((title) => livePattern.test(title) && !skipPattern.test(title));

      for (const fileTitle of candidates.slice(0, 6)) {
        const imageUrl = await fetchWikipediaFileImageUrl(fileTitle);
        if (!imageUrl) {
          continue;
        }
        const ok = await canLoadImage(imageUrl);
        if (ok) {
          return {
            url: imageUrl,
            caption: formatLivePhotoCaption(fileTitle)
          };
        }
      }
    } catch (error) {
      console.warn("Live photo lookup failed:", error);
    }

    if (fallbackThumbnail) {
      return {
        url: fallbackThumbnail,
        caption: artistName + " — archival photo"
      };
    }

    return null;
  }

  function renderLivePhoto(photo, artistName) {
    if (!livePhoto) {
      return;
    }

    if (photo?.url) {
      livePhoto.style.backgroundImage =
        "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(\"" + photo.url + "\")";
      livePhoto.style.backgroundSize = "cover";
      livePhoto.style.backgroundPosition = "center";
      livePhoto.setAttribute("aria-label", (artistName || "Artist") + " live performance photo");
      if (liveDocHeading) {
        liveDocHeading.textContent = photo.caption || (artistName + " — live");
      }
      if (liveDocBlurb) {
        liveDocBlurb.textContent = "Live performance image sourced from Wikimedia archives.";
      }
      return;
    }

    livePhoto.style.backgroundImage = "";
    livePhoto.style.backgroundSize = "";
    livePhoto.style.backgroundPosition = "";
    livePhoto.setAttribute("aria-label", "Live performance photo unavailable");
    if (liveDocHeading) {
      liveDocHeading.textContent = "Live performance";
    }
    if (liveDocBlurb) {
      liveDocBlurb.textContent = "No live show photo found for this artist yet.";
    }
  }

  async function fetchWikipediaMeta(artistName) {
    if (!artistName) {
      return { extract: "", wikibaseItem: null, thumbnail: null };
    }

    const title = encodeURIComponent(artistName.replace(/\s+/g, "_"));
    const url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + title;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return { extract: "", wikibaseItem: null, thumbnail: null };
    }

    const data = await res.json();
    return {
      extract: data.extract || "",
      wikibaseItem: data.wikibase_item || null,
      thumbnail: data.thumbnail?.source || null
    };
  }

  function extractWikidataId(artistDetails) {
    for (const rel of artistDetails?.relations || []) {
      if (rel.type !== "wikidata") {
        continue;
      }
      const resource = rel.url?.resource || "";
      const match = resource.match(/(Q\d+)\s*$/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  const WIKIDATA_BAND_TYPES = new Set([
    "Q215380",
    "Q5741069",
    "Q2088357"
  ]);

  function isWikidataBand(entity) {
    const instanceClaims = entity?.claims?.P31 || [];
    for (const claim of instanceClaims) {
      const typeId = claim.mainsnak?.datavalue?.value?.id;
      if (typeId && WIKIDATA_BAND_TYPES.has(typeId)) {
        return true;
      }
    }
    return false;
  }

  async function fetchWikidataInfluenceIds(wikidataId) {
    const url = "https://www.wikidata.org/wiki/Special:EntityData/" + wikidataId + ".json";
    let data;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        return [];
      }
      data = await res.json();
    } catch (error) {
      console.warn("Wikidata influence lookup failed:", error);
      return [];
    }
    const entity = data.entities?.[wikidataId];
    const claims = entity?.claims?.P737 || [];
    const ids = [];

    for (const claim of claims) {
      const value = claim.mainsnak?.datavalue?.value;
      const id = value?.id;
      if (id && !ids.includes(id)) {
        ids.push(id);
      }
    }

    return ids;
  }

  async function fetchWikidataEntityDetails(ids) {
    if (!ids.length) {
      return [];
    }

    const url = "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + ids.join("|") + "&format=json&props=labels|descriptions|claims&languages=en&origin=*";
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const entities = data.entities || {};

    return ids.map((id) => {
      const entity = entities[id];
      return {
        id: id,
        name: entity?.labels?.en?.value || id,
        description: entity?.descriptions?.en?.value || "",
        isBand: isWikidataBand(entity)
      };
    });
  }

  async function resolveInfluencerToBand(personName) {
    const query = encodeURIComponent('artist:"' + personName + '"');
    const searchData = await mbFetch("https://musicbrainz.org/ws/2/artist/?query=" + query + "&fmt=json&limit=5");
    const artists = searchData.artists || [];
    const directGroup = artists.find((artist) => artist.type === "Group");
    if (directGroup) {
      return {
        name: directGroup.name,
        description: "Band associated with influence " + personName + "."
      };
    }

    const person = artists.find((artist) => artist.type === "Person") || artists[0];
    if (!person) {
      return null;
    }

    const detail = await mbFetch("https://musicbrainz.org/ws/2/artist/" + person.id + "?fmt=json&inc=artist-rels");
    const bandRelation = (detail.relations || []).find((relation) => relation.type === "member of band" && relation.artist);
    if (!bandRelation) {
      return null;
    }

    return {
      name: bandRelation.artist.name,
      description: "Linked to influence " + personName + "."
    };
  }

  async function fetchOlderSceneBands(artistMbid, artistDetails, seenNames, needed) {
    if (!needed) {
      return [];
    }

    const tags = (artistDetails?.tags || []).map((tag) => tag.name).filter(Boolean).slice(0, 2);
    const artistBeginYear = parseInt(artistDetails?.["life-span"]?.begin, 10) || 9999;
    const sceneBands = [];

    for (const tag of tags) {
      if (sceneBands.length >= needed) {
        break;
      }

      const query = encodeURIComponent("tag:" + tag + ' AND type:"group"');
      const url = "https://musicbrainz.org/ws/2/artist?query=" + query + "&fmt=json&limit=20";
      const data = await mbFetch(url);

      for (const artist of data.artists || []) {
        if (artist.id === artistMbid) {
          continue;
        }

        const key = artist.name.toLowerCase();
        if (seenNames.has(key)) {
          continue;
        }

        const bandBeginYear = parseInt(artist["life-span"]?.begin, 10) || 9999;
        if (bandBeginYear >= artistBeginYear) {
          continue;
        }

        seenNames.add(key);
        sceneBands.push({
          name: artist.name,
          description: "Earlier act in the " + tag + " scene."
        });

        if (sceneBands.length >= needed) {
          break;
        }
      }
    }

    return sceneBands;
  }

  async function fetchPredecessorThumbnail(name) {
    const meta = await fetchWikipediaMeta(name);
    return meta.thumbnail;
  }

  async function fetchInfluencingBands(artistDetails, artistName, wikibaseItem, artistMbid) {
    try {
      const wikidataId = extractWikidataId(artistDetails) || wikibaseItem;
      if (!wikidataId) {
        return [];
      }

      const influenceIds = await fetchWikidataInfluenceIds(wikidataId);
      const influenceEntities = await fetchWikidataEntityDetails(influenceIds);
      const bands = [];
      const seenNames = new Set();
      const soloInfluencers = [];

      for (const influence of influenceEntities) {
        const key = influence.name.toLowerCase();
        if (influence.isBand && !seenNames.has(key)) {
          seenNames.add(key);
          bands.push({
            name: influence.name,
            description: influence.description || "Documented influencing band."
          });
        } else if (!influence.isBand) {
          soloInfluencers.push(influence.name);
        }
      }

      for (const personName of soloInfluencers) {
        if (bands.length >= 4) {
          break;
        }
        const band = await resolveInfluencerToBand(personName);
        if (!band) {
          continue;
        }
        const key = band.name.toLowerCase();
        if (seenNames.has(key)) {
          continue;
        }
        seenNames.add(key);
        bands.push(band);
      }

      if (bands.length < 4) {
        const sceneBands = await fetchOlderSceneBands(artistMbid, artistDetails, seenNames, 4 - bands.length);
        bands.push(...sceneBands);
      }

      const withThumbnails = await Promise.all(
        bands.slice(0, 4).map(async (band) => ({
          ...band,
          thumbnail: await fetchPredecessorThumbnail(band.name)
        }))
      );

      return withThumbnails;
    } catch (error) {
      console.warn("Influencing band lookup failed:", error);
      return [];
    }
  }

  function renderInfluences(predecessors, bandName) {
    if (!influenceList) {
      return;
    }

    influenceList.innerHTML = "";

    if (!predecessors?.length) {
      const item = document.createElement("li");
      item.className = "influence-empty";
      const text = document.createElement("div");
      text.className = "influence-text";
      text.innerHTML = "<p>No influencing bands found for this artist yet.</p>";
      item.appendChild(text);
      influenceList.appendChild(item);
      return;
    }

    for (const predecessor of predecessors) {
      const item = document.createElement("li");

      const image = document.createElement("div");
      image.className = "influence-img";
      image.setAttribute("aria-hidden", "true");
      if (predecessor.thumbnail) {
        image.style.backgroundImage = "url('" + predecessor.thumbnail + "')";
        image.style.backgroundSize = "cover";
        image.style.backgroundPosition = "center";
      }

      const text = document.createElement("div");
      text.className = "influence-text";

      const name = document.createElement("strong");
      name.textContent = predecessor.name;

      const role = document.createElement("em");
      role.textContent = "Influencing band";

      const blurb = document.createElement("p");
      const detail = predecessor.description || "Documented influence";
      blurb.textContent = detail + " on " + (bandName || "this artist") + ".";

      text.appendChild(name);
      text.appendChild(role);
      text.appendChild(blurb);
      item.appendChild(image);
      item.appendChild(text);
      influenceList.appendChild(item);
    }
  }

  // MusicBrainz relationship "type" -> display role + blurb. Higher in the list = higher priority
  // when one person holds multiple roles, so we surface the most senior credit.
  const CONTRIBUTOR_ROLES = [
    { type: "producer", label: "Producer", blurb: "Produced the album sessions." },
    { type: "engineer", label: "Engineer", blurb: "Engineered the studio recordings." },
    { type: "mix", label: "Mixing Engineer", blurb: "Mixed the album." },
    { type: "mastering", label: "Mastering Engineer", blurb: "Mastered the final recordings." }
  ];

  function buildContributors(releaseRelations, artistDetails, albumTitle) {
    const album = albumTitle || "the album";
    const MANAGER_INDEX = CONTRIBUTOR_ROLES.length;
    const people = new Map();

    // Tally how many credits each person holds per role, so the primary
    // producer/engineer (most recordings worked on) ranks highest.
    const tally = (name, roleIndex) => {
      if (!name || roleIndex === -1) return;
      let person = people.get(name);
      if (!person) {
        person = { name: name, roleCounts: new Map() };
        people.set(name, person);
      }
      person.roleCounts.set(roleIndex, (person.roleCounts.get(roleIndex) || 0) + 1);
    };

    // Producers / engineers / mixers / mastering come from the album's relations.
    for (const relation of releaseRelations || []) {
      tally(relation.artist?.name, CONTRIBUTOR_ROLES.findIndex((r) => r.type === relation.type));
    }

    // Managers come from the artist's own relationships.
    for (const relation of artistDetails?.relations || []) {
      if (relation.type === "manager") {
        tally(relation.artist?.name, MANAGER_INDEX);
      }
    }

    const ranked = [...people.values()].map((person) => {
      // Dominant role = most credits; ties broken by role seniority (lower index).
      let bestIndex = MANAGER_INDEX;
      let bestCount = -1;
      let total = 0;
      for (const [index, count] of person.roleCounts) {
        total += count;
        if (count > bestCount || (count === bestCount && index < bestIndex)) {
          bestCount = count;
          bestIndex = index;
        }
      }
      return { name: person.name, roleIndex: bestIndex, total: total };
    });

    // Most-credited contributors first; break ties by role seniority.
    ranked.sort((a, b) => b.total - a.total || a.roleIndex - b.roleIndex);

    return ranked.slice(0, 6).map((person) => {
      if (person.roleIndex === MANAGER_INDEX) {
        return { name: person.name, role: "Manager", blurb: "Managed the band's career and direction." };
      }
      const role = CONTRIBUTOR_ROLES[person.roleIndex];
      const blurb = role.type === "producer"
        ? "Produced the " + album + " sessions."
        : role.blurb;
      return { name: person.name, role: role.label, blurb: blurb };
    });
  }

  function renderContributors(contributors, bandName) {
    if (!contributorsList) {
      return;
    }

    contributorsList.innerHTML = "";

    if (!contributors?.length) {
      const empty = document.createElement("p");
      empty.className = "contributors-empty";
      empty.textContent = "No documented producers, engineers, or managers found for "
        + (bandName || "this artist") + " on MusicBrainz.";
      contributorsList.appendChild(empty);
      return;
    }

    for (const contributor of contributors) {
      const card = document.createElement("div");
      card.className = "contributor";

      const portrait = document.createElement("div");
      portrait.className = "portrait";
      portrait.setAttribute("aria-hidden", "true");

      const name = document.createElement("strong");
      name.textContent = contributor.name;

      const role = document.createElement("em");
      role.textContent = contributor.role;

      const blurb = document.createElement("p");
      blurb.textContent = contributor.blurb;

      card.appendChild(portrait);
      card.appendChild(name);
      card.appendChild(role);
      card.appendChild(blurb);
      contributorsList.appendChild(card);
    }
  }

  function pickScene(details) {
    const genres = (details.genres || []).map((g) => g.name).filter(Boolean);
    const tags = (details.tags || []).map((t) => t.name).filter(Boolean);
    const merged = [...genres, ...tags];
    if (!merged.length) return "No tags available";
    return merged.slice(0, 4).join(" / ");
  }

  function splitIntoSentences(text) {
    if (!text) return [];
    return text
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function renderBulletList(listEl, items, fallbackText) {
    if (!listEl) return;
    listEl.innerHTML = "";

    const cleaned = (items || []).map((item) => item.trim()).filter(Boolean);
    const values = cleaned.length ? cleaned : [fallbackText];
    for (const value of values) {
      const li = document.createElement("li");
      li.textContent = value;
      listEl.appendChild(li);
    }
  }

  function renderEssentialInfo(details, releaseGroup, release, trackNames, summaryText) {
    const summarySentence = splitIntoSentences(summaryText)[0] || "";
    const trackCount = (trackNames || []).length;
    const bulletPoints = [
      summarySentence,
      releaseGroup?.title ? "Album focus: " + releaseGroup.title + "." : "",
      release?.date ? "First release date: " + formatDate(release.date) + "." : "",
      details?.area?.name ? "Origin area: " + details.area.name + "." : "",
      trackCount ? "This edition includes " + trackCount + " listed tracks." : ""
    ];

    renderBulletList(
      essentialInfoList,
      bulletPoints.slice(0, 5),
      "No extended context available yet for this artist."
    );
  }

  function renderKeyContext(details, releaseGroup, release, summaryText) {
    const genres = (details?.genres || []).map((genre) => genre.name).filter(Boolean).slice(0, 2);
    const tags = (details?.tags || []).map((tag) => tag.name).filter(Boolean).slice(0, 2);
    const sentence = splitIntoSentences(summaryText)[1] || "";

    const contextItems = [
      releaseGroup?.["first-release-date"] ? "★ Era marker: " + releaseGroup["first-release-date"] + "." : "",
      details?.["life-span"]?.begin ? "🎤 Career starts in " + details["life-span"].begin + "." : "",
      genres.length ? "🏛 Core genres: " + genres.join(" / ") + "." : "",
      tags.length ? "↯ Scene tags: " + tags.join(" / ") + "." : "",
      release?.country ? "📍 Early release region: " + release.country + "." : "",
      sentence
    ];

    renderBulletList(
      keyContextList,
      contextItems.slice(0, 4),
      "No additional context available for this artist yet."
    );
  }

  function renderArtist(details) {
    albumName.textContent = (details.name || "Unknown Artist").toUpperCase();
    albumSub.textContent = "Artist Overview";
    factLabel1.textContent = "ACTIVE YEARS";
    factValue1.textContent = formatLifeSpan(details["life-span"]);
    factValue2.textContent = details.area?.name || details.country || "Unknown";
    factLabel3.textContent = "ARTIST TYPE";
    factValue3.textContent = toTitleCase(details.type || "artist");
    factValue4.textContent = pickScene(details);
  }

  function renderAlbum(releaseGroup, release, artistName, coverUrl) {
    if (!releaseGroup) {
      return;
    }

    albumSub.textContent = releaseGroup.title || "Artist Overview";
    factLabel1.textContent = "RELEASED";
    factValue1.textContent = formatDate(release?.date || releaseGroup["first-release-date"]);
    factLabel3.textContent = "LABEL";
    factValue3.textContent = release?.["label-info"]?.[0]?.label?.name || "Unknown";

    coverTitle.textContent = (artistName || "UNKNOWN ARTIST").toUpperCase();
    const splitTitle = splitTitleForCover(releaseGroup.title);
    coverPlease.textContent = splitTitle.line1;
    coverPleaseMe.textContent = splitTitle.line2;
    coverWithLove.textContent = (release?.date ? "Released " + formatDate(release.date) : "Album metadata from MusicBrainz");
    albumCover.setAttribute("aria-label", "Album cover: " + (releaseGroup.title || "Unknown release"));

    if (coverUrl) {
      albumCover.style.backgroundImage = "linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.35)), url('" + coverUrl + "')";
      albumCover.style.backgroundSize = "cover";
      albumCover.style.backgroundPosition = "center";
    } else {
      albumCover.style.backgroundImage = "";
      albumCover.style.backgroundSize = "";
      albumCover.style.backgroundPosition = "";
    }
  }

  function updateWatchLink(artistName, albumTitle) {
    if (!watchPerformanceLink) {
      return;
    }

    if (!artistName) {
      watchPerformanceLink.href = "#";
      watchPerformanceLink.classList.add("is-disabled");
      watchPerformanceLink.setAttribute("aria-disabled", "true");
      return;
    }

    const query = albumTitle
      ? artistName + " " + albumTitle + " live performance"
      : artistName + " live performance";
    watchPerformanceLink.href = buildYouTubeSearchUrl(query);
    watchPerformanceLink.classList.remove("is-disabled");
    watchPerformanceLink.removeAttribute("aria-disabled");
  }

  function renderListenNext(releaseGroups, featuredGroupId, artistName) {
    if (!nextCovers) {
      return;
    }

    nextCovers.innerHTML = "";
    const related = (releaseGroups || [])
      .filter((group) => group.id !== featuredGroupId)
      .slice(0, 4);

    if (!related.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "listen-next-empty";
      placeholder.textContent = "No related albums found yet.";
      nextCovers.appendChild(placeholder);
      return;
    }

    for (const group of related) {
      const link = document.createElement("a");
      link.className = "next-cover";
      link.href = buildYouTubeSearchUrl(artistName + " " + group.title + " full album");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = group.title + " on YouTube";

      const coverUrl = "https://coverartarchive.org/release-group/" + group.id + "/front-250";
      link.style.backgroundImage = "linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.35)), url('" + coverUrl + "')";

      const play = document.createElement("div");
      play.className = "play-mini";
      play.textContent = "▶";
      link.appendChild(play);

      nextCovers.appendChild(link);
    }
  }

  function renderTracks(trackNames) {
    if (!essentialTracksList) {
      return;
    }

    essentialTracksList.innerHTML = "";

    const tracksToRender = (trackNames || []).slice(0, 20);
    if (!tracksToRender.length) {
      const fallback = document.createElement("li");
      fallback.textContent = "Track data unavailable for this release.";
      essentialTracksList.appendChild(fallback);
      return;
    }

    for (const trackName of tracksToRender) {
      const li = document.createElement("li");
      li.textContent = trackName;
      essentialTracksList.appendChild(li);
    }
  }

  async function searchAndRenderArtist() {
    const rawName = bandSearchInput.value.trim();
    if (!rawName) {
      searchStatus.textContent = "Enter a band name first.";
      return;
    }

    if (location.protocol === "file:") {
      searchStatus.textContent = "Serve this page over http:// (not file://) so APIs can load.";
      return;
    }

    // Clear stale tracks immediately so the UI reflects the current search state.
    renderTracks([]);
    renderEssentialInfo(null, null, null, [], "");
    renderKeyContext(null, null, null, "");
    updateWatchLink(null, null);
    renderListenNext([], null, "");
    renderTimeline([], null);
    renderInfluences([], "");
    renderContributors([], "");
    renderLivePhoto(null, "");
    searchStatus.textContent = "Searching MusicBrainz...";
    bandSearchBtn.disabled = true;

    try {
      const topArtist = await fetchArtistByName(rawName);
      if (!topArtist) {
        searchStatus.textContent = 'No artist found for "' + rawName + '".';
        return;
      }

      const details = await fetchArtistDetails(topArtist.id);
      renderArtist(details);

      let summaryText = "";
      let wikibaseItem = null;
      let wikiThumbnail = null;
      try {
        const wikiMeta = await fetchWikipediaMeta(details.name);
        summaryText = wikiMeta.extract;
        wikibaseItem = wikiMeta.wikibaseItem;
        wikiThumbnail = wikiMeta.thumbnail;
      } catch (wikiError) {
        console.warn("Wikipedia lookup failed:", wikiError);
      }

      const livePhotoData = await fetchLiveShowPhoto(details.name, wikiThumbnail);
      renderLivePhoto(livePhotoData, details.name);

      const influencingBands = await fetchInfluencingBands(details, details.name, wikibaseItem, topArtist.id);
      renderInfluences(influencingBands, details.name);

      let albumGroups = parseAlbumReleaseGroups(details);
      if (!albumGroups.length) {
        albumGroups = await fetchAlbumReleaseGroups(topArtist.id);
      }
      const releaseGroup = albumGroups.length ? albumGroups[0] : null;
      if (releaseGroup) {
        const release = await fetchReleaseForGroup(releaseGroup.id);
        const coverUrl = release ? await resolveCoverUrl(release.id, releaseGroup.id) : null;
        renderAlbum(releaseGroup, release, details.name, coverUrl);
        updateWatchLink(details.name, releaseGroup.title);
        renderListenNext(albumGroups, releaseGroup.id, details.name);
        renderTimeline(albumGroups, releaseGroup.id);
        let loadedTracks = [];
        if (release) {
          try {
            loadedTracks = await fetchReleaseTracklist(release.id);
            renderTracks(loadedTracks);
          } catch (trackError) {
            console.error(trackError);
            renderTracks([]);
          }
        } else {
          renderTracks([]);
        }
        renderEssentialInfo(details, releaseGroup, release, loadedTracks, summaryText);
        renderKeyContext(details, releaseGroup, release, summaryText);

        let releaseRelations = [];
        if (release) {
          try {
            releaseRelations = await fetchReleaseRelations(release.id);
          } catch (relError) {
            console.warn("Contributor lookup failed:", relError);
          }
        }
        renderContributors(buildContributors(releaseRelations, details, releaseGroup.title), details.name);

        searchStatus.textContent = 'Loaded artist, album, and track data for "' + details.name + '".';
      } else {
        renderTracks([]);
        updateWatchLink(details.name, null);
        renderListenNext([], null, details.name);
        renderTimeline(albumGroups, null);
        renderEssentialInfo(details, null, null, [], summaryText);
        renderKeyContext(details, null, null, summaryText);
        renderContributors(buildContributors([], details, null), details.name);
        searchStatus.textContent = 'Loaded artist data for "' + details.name + '" (no album found).';
      }
    } catch (error) {
      console.error(error);
      renderTracks([]);
      renderEssentialInfo(null, null, null, [], "");
      renderKeyContext(null, null, null, "");
      updateWatchLink(null, null);
      renderListenNext([], null, "");
      renderTimeline([], null);
      renderInfluences([], "");
      renderContributors([], "");
      renderLivePhoto(null, "");
      const detail = error?.message ? " (" + error.message + ")" : "";
      searchStatus.textContent = "Could not load artist data right now." + detail;
    } finally {
      bandSearchBtn.disabled = false;
    }
  }

  bandSearchBtn.addEventListener("click", searchAndRenderArtist);
  bandSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchAndRenderArtist();
    }
  });
