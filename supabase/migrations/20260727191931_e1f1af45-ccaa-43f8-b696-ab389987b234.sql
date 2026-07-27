UPDATE public.trips
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND (
    end_location ~* '(meet\.google\.com|zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeeting\.com|whereby\.com|bluejeans\.com|meet\.jit\.si|jitsi|hangouts\.google\.com|skype:|around\.co|8x8\.vc|framatalk|bigbluebutton|livekit|clickmeeting|livewebinar|demio\.com|livestorm|slack\.com/call)'
    OR end_location ~* '\y(visio|visioconf|en\s+visio)\y'
    OR start_location ~* '(meet\.google\.com|zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeeting\.com|whereby\.com|bluejeans\.com|meet\.jit\.si|jitsi|hangouts\.google\.com|skype:|around\.co|8x8\.vc|framatalk|bigbluebutton|livekit|clickmeeting|livewebinar|demio\.com|livestorm|slack\.com/call)'
    OR start_location ~* '\y(visio|visioconf|en\s+visio)\y'
  );