import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        text = " ".join([item['text'] for item in transcript_list])
        return {"success": True, "transcript": text}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        v_id = sys.argv[1]
        result = get_transcript(v_id)
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "error": "No Video ID provided"}))
