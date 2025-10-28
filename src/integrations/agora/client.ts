import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack, IMicrophoneAudioTrack, ICameraVideoTrack, RemoteUser, IRemoteAudioTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

export type AgoraSession = {
  client: IAgoraRTCClient;
  localAudio?: ILocalAudioTrack | IMicrophoneAudioTrack;
  localVideo?: ILocalVideoTrack | ICameraVideoTrack;
  joined: boolean;
};

export async function createAgoraClient(): Promise<IAgoraRTCClient> {
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  return client;
}

export async function joinChannel(appId: string, channel: string, token: string | null, uid?: string | number) {
  const client = await createAgoraClient();
  const assignedUid = await client.join(appId, channel, token || null, uid || null);
  return { client, uid: assignedUid } as const;
}

export async function publishTracks(client: IAgoraRTCClient, withAudio: boolean, withVideo: boolean) {
  const [microphoneTrack, cameraTrack] = await Promise.all([
    withAudio ? AgoraRTC.createMicrophoneAudioTrack() : Promise.resolve(undefined),
    withVideo ? AgoraRTC.createCameraVideoTrack() : Promise.resolve(undefined),
  ]);

  const tracks = [microphoneTrack, cameraTrack].filter(Boolean) as (ILocalAudioTrack | ILocalVideoTrack)[];
  if (tracks.length > 0) {
    await client.publish(tracks);
  }
  return { microphoneTrack, cameraTrack } as const;
}

export function subscribeRemote(client: IAgoraRTCClient, onUserPublished: (user: RemoteUser, mediaType: 'audio'|'video') => void, onUserUnpublished?: (user: RemoteUser, mediaType: 'audio'|'video') => void) {
  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    onUserPublished(user, mediaType);
  });
  if (onUserUnpublished) {
    client.on('user-unpublished', onUserUnpublished);
  }
}

export async function leaveSession(session: AgoraSession) {
  try {
    if (session.localAudio) {
      session.localAudio.stop();
      session.localAudio.close();
    }
    if (session.localVideo) {
      session.localVideo.stop();
      session.localVideo.close();
    }
    await session.client.leave();
  } catch {
    // ignore
  }
}
