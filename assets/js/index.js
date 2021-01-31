// create Agora client
var client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
var localTracks = {
  videoTrack: null,
  audioTrack: null
};
var remoteUsers = {};
// Agora client options
var options = {
  appid: "a6af85f840ef43108491705e2315a857",
  channel: null,
  uid: null,
  token: null,
  role: "audience" // host or audience
};

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = "a6af85f840ef43108491705e2315a857";
  options.channel = urlParams.get("channel");
  if (options.appid && options.channel) {
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }
  enableUiControls();
})

$("#host-join").click(function (e) {
  options.role = "host"
})

$("#audience-join").click(function (e) {
  options.role = "audience"
})

$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#host-join").attr("disabled", true);
  $("#audience-join").attr("disabled", true);
  try {
    options.appid = "a6af85f840ef43108491705e2315a857";
    options.channel = $("#channel").val();
    await join();
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
})

$("#leave").click(function (e) {
  leave();
})

async function join() {
  // create Agora client
  client.setClientRole(options.role);
  if (options.role === "audience") {
    // add event listener to play remote tracks when remote user publishs.
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
  }
  // join the channel
  options.uid = await client.join(options.appid, options.channel, options.token || null);
  if (options.role === "host") {
    $('#mic-btn').prop('disabled', false);
    $('#video-btn').prop('disabled', false);
    // create local audio and video tracks
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
    // play local video track
    localTracks.videoTrack.play("local-player");
    $("#local-player-name").text(`localTrack(${options.uid})`);
    // publish local tracks to channel
    await client.publish(Object.values(localTracks));
    console.log("Successfully published.");
  }
}

async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      $('#mic-btn').prop('disabled', true);
      $('#video-btn').prop('disabled', true);
      localTracks[trackName] = undefined;
    }
  }
  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");
  // leave the channel
  await client.leave();
  $("#local-player-name").text("");
  $("#host-join").attr("disabled", false);
  $("#audience-join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("Client successfully left channel.");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("Successfully subscribed.");
  if (mediaType === 'video') {
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="player-${uid}" class="player"></div>
      </div>
    `);
    $("#remote-playerlist").append(player);
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

// Action buttons
function enableUiControls() {
  $("#mic-btn").prop("disabled", false);
  $("#video-btn").prop("disabled", false);
  $("#mic-btn").click(function () {
    toggleMic();
  });
  $("#video-btn").click(function () {
    toggleVideo();
  });
}

// Toggle Mic
function toggleMic() {
  $("#mic-icon").toggleClass('fa-microphone').toggleClass('fa-microphone-slash');
  if ($("#mic-icon").hasClass('fa-microphone')) {
    localTracks.audioTrack.setEnabled(false);
  } else {
    localTracks.audioTrack.setEnabled(true);
  }
}

// Toggle Video
function toggleVideo() {
  if ($("#video-icon").hasClass('fa-video')) {
    localTracks.videoTrack.setEnabled(false);
  } else {
    localTracks.videoTrack.setEnabled(true);
  }
  $("#video-icon").toggleClass('fa-video').toggleClass('fa-video-slash');
}