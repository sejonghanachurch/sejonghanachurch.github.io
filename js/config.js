/** Public browser configuration. Use a referrer-restricted API key, never a service-account key. */
export const CONFIG = {
  googleApiKey: 'AIzaSyDDKozm3Vx0ORiBbVHN7wLvU5Fv_9vqKeI', // Enable Google Drive API and YouTube Data API v3; restrict key to your website domains.
  driveRootFolderId: '1Yev0W9aosjq3V0csy5mioNj2KKn2Ccuy',
  youtubeChannelId: 'UCBlksyAAB24gB6DTzb5MtKQ',
  youtubeUploadsPlaylistId: '', // Optional; discovered through channels.list when blank.
  jubileePlaylistId: 'PLYVmVd0kt83fwuENRS4VTsRDGyF2ini_Z', // 쥬빌리기도회 공식 재생목록.
  missionPlaylistId: 'PLYVmVd0kt83ck2etJOHYmsNTksjv2DWEx', // 선교 영상 재생목록.
  youngAdultPlaylistId: 'PLYVmVd0kt83c7V2hlhUywOzH5ugb1PJZP', // 청년회 영상 재생목록.
  visionPlaylistId: 'PLYVmVd0kt83fGPFmsThGEJ5MjqaiULOk9', // 교회 비전 영상 재생목록.
  youtubeShortsPlaylistId: 'UUSHBlksyAAB24gB6DTzb5MtKQ', // 채널 Shorts 전용 목록. 실제 채널 화면과 대조한 ID.
  oneMinutePlaylistId: 'PLYVmVd0kt83dIuruIySfRxuB4oTHjuON2', // 내 삶을 바꾸는 1분.
  infantPlaylists: [
    {id:'PLYVmVd0kt83cMJQ3B6BWUJOyykYUCmJu6',title:'유치부'},
    {id:'PLYVmVd0kt83enkUser7lR_fQn-beEXaMJ',title:'유아부 예쁜말성경'}
  ],
  youtubeSermonKeyword: '설교',
  cacheMinutes: 10, // Video and unchanged JSON cache only; Drive folder listings are always fresh.
  requestTimeoutMs: 12000,
};
