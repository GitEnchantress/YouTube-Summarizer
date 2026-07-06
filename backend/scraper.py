import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        raw_data = None
        
        # Strategy 1: Attempt direct download of native English tracks first
        try:
            raw_data = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except Exception:
            pass

        # Strategy 2: Fallback to listing all available tracks using an API instance
        if not raw_data:
            api_instance = YouTubeTranscriptApi()
            transcript_list = api_instance.list(video_id)
            
            try:
                # Target auto-generated English track safely
                raw_data = transcript_list.find_generated_transcript(['en']).fetch()
            except Exception:
                try:
                    # Target manual tracks if any exist
                    raw_data = transcript_list.find_manually_created_transcript([]).fetch()
                except Exception:
                    # Ultimate Fallback: Grab whatever track exists and translate it directly to English via YT
                    first_track = next(iter(transcript_list._manually_created_transcripts.values()), None) or \
                                  next(iter(transcript_list._generated_transcripts.values()), None)
                    if first_track:
                        raw_data = first_track.translate('en').fetch()

        if not raw_data:
            raise Exception("No extractable captions or translatable tracks found for this video ID.")

        # FIXED: Handle both object lists and dictionary lists safely to prevent subscription crashes
        text_segments = []
        for item in raw_data:
            if hasattr(item, 'text'):
                text_segments.append(item.text)  # For object notation (FetchedTranscriptSnippet)
            elif isinstance(item, dict) and 'text' in item:
                text_segments.append(item['text'])  # For classic dictionary notation
            else:
                text_segments.append(str(item))

        full_transcript = " ".join(text_segments)
        return {"success": True, "transcript": full_transcript}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Cleanly extract video ID from command line arguments
        video_id = sys.argv[1].strip()
        video_id = video_id.replace('[', '').replace(']', '').replace("'", "").replace('"', '')
        
        result = get_transcript(video_id)
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "error": "No Video ID parameter received"}))
