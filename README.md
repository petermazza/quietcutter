# Video Silence Remover

A robust, single-page **Client-Side Video Silence Remover** built with Next.js 14 (App Router), FFmpeg.wasm, and Tailwind CSS.

## Features

- 🎬 **Client-Side Processing**: All video processing happens in your browser using WebAssembly
- 🔇 **Silence Detection**: Automatically detect and remove silent segments from videos
- ⚙️ **Adjustable Threshold**: Configure silence detection threshold (-60dB to -10dB)
- 📁 **Drag & Drop Upload**: Easy video file upload via drag and drop or file picker
- 📊 **Real-Time Progress**: Live progress tracking during video processing
- 💾 **Download Processed Video**: Save the processed video directly to your device
- 🎨 **Beautiful UI**: Modern dark mode interface with Tailwind CSS and shadcn/ui components
- 🔒 **Privacy First**: No data is uploaded to any server - everything runs locally

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with zinc/slate dark mode colors
- **UI Components**: shadcn/ui
- **Video Processing**: FFmpeg.wasm (@ffmpeg/ffmpeg v0.12.10)
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ or Yarn 1.22+
- Modern web browser with WebAssembly support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd video-silence-remover
```

2. Install dependencies:
```bash
yarn install
```

3. Run the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Upload a Video**: Drag and drop a video file (MP4, AVI, MOV, MKV) or click to browse
2. **Adjust Threshold**: Set the silence detection threshold (default: -30dB)
3. **Process**: Click "Remove Silence" to analyze and remove silent segments
4. **Download**: Download the processed video when complete

## Technical Details

### Silence Removal Algorithm

The application uses FFmpeg's `silenceremove` filter with the following parameters:
- `stop_periods=-1`: Remove all silent periods
- `stop_duration=0.5`: Consider segments longer than 0.5s as silence
- `stop_threshold=-30dB`: Volume threshold for silence detection

### Security Headers

The application requires specific CORS headers for FFmpeg.wasm to function:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`

These are configured in `next.config.js`.

### FFmpeg Core

The application uses FFmpeg.wasm with the single-threaded core for better compatibility:
- Core URL: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd`

## File Structure

```
/app
├── app/
│   ├── page.js              # Main video processor component
│   ├── layout.js            # Root layout with metadata
│   ├── globals.css          # Global styles
│   └── components/ui/       # shadcn/ui components
├── next.config.js           # Next.js configuration with security headers
├── package.json             # Dependencies
└── README.md               # This file
```

## Supported Video Formats

- MP4
- AVI
- MOV
- MKV
- And other formats supported by FFmpeg

## Browser Compatibility

- Chrome/Edge 92+
- Firefox 95+
- Safari 16.4+
- Any modern browser with WebAssembly and SharedArrayBuffer support

## Performance Notes

- Processing time depends on video length and your device's performance
- Longer videos may take several minutes to process
- All processing is done locally - no server upload required
- The application shows real-time progress during processing

## Troubleshooting

### FFmpeg fails to load
- Ensure you're using a modern browser with WebAssembly support
- Check browser console for specific error messages
- Try clearing browser cache and reloading

### Processing fails
- Ensure the video file is a supported format
- Try a smaller video file first
- Check that your browser isn't blocking cross-origin requests

## Development

### Build for Production
```bash
yarn build
yarn start
```

### Key Dependencies
- `@ffmpeg/ffmpeg@^0.12.10` - FFmpeg WebAssembly port
- `@ffmpeg/util@^0.12.1` - Utility functions for FFmpeg.wasm
- `next@14.2.3` - Next.js framework
- `lucide-react` - Icon library

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- FFmpeg.wasm team for the amazing WebAssembly port
- shadcn/ui for the beautiful component library
- Next.js team for the excellent framework
