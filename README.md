# Local Files Tagger

A Next.js-based desktop application for browsing, viewing, and tagging local files on your computer. Organize your images and text files with custom tags stored in a SQLite database.

## Features

- **File Browser**: Navigate through your local file system with an intuitive three-column interface
- **File Viewer**: 
  - Preview images directly in the application
  - View text files with syntax preservation
  - Keyboard navigation (arrow keys) between files
- **Tag Management**:
  - Create custom tags for images and text files
  - Tag-based file organization
  - Separate tag namespaces for images and text files
  - Checkbox interface for quick tag assignment
- **Content-Based File Identification**: Files are identified by SHA256 hash of their content, making tags persistent even when files are moved
- **Smart UI**:
  - File type counters with quick access
  - Real-time tag filtering by file type
  - Associated tags displayed at the top of the list

## Prerequisites

- **Node.js**: Version 22 or higher (LTS recommended)
- **npm**: Comes with Node.js

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd local-files-tagger
```

2. Navigate to the application folder:
```bash
cd lft-app
```

3. Install dependencies:
```bash
npm install
```

4. Configure the starting folder (optional):
Edit `public/config.json` to set your default folder:
```json
{
  "startFolder": "/path/to/your/folder"
}
```

## Running the Application

1. Make sure you're using Node.js 22:
```bash
nvm use 22
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Browsing Files

1. Enter a folder path in the text field at the top or use the default configured path
2. Click on folders to navigate into them
3. Click on ".." to go to the parent folder
4. Click on the file type counters to quickly view the first file of that type

### Viewing Files

- **Images**: Click on any image file to preview it in the center column
- **Text Files**: Click on any text file to view its contents with formatting preserved
- **Navigation**: Use the left/right arrow keys to move between files of the same type

### Managing Tags

1. Select a file (image or text)
2. In the right column (Tags):
   - **Create a new tag**: Type in the input field and press Enter or click the "+" button
   - **Assign a tag**: Check the checkbox next to the tag name
   - **Remove a tag**: Uncheck the checkbox next to the tag name
   - **Edit a tag name**: Click on the tag label to edit it inline
     - Press Enter or click outside to save changes
     - Press Escape to cancel editing
     - Type "-" and save to delete the tag from the database
3. Tags are automatically filtered by file type:
   - Image files show only image tags
   - Text files show only text tags

## Project Structure

```
lft-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── files/       # File system API
│   │   │   ├── image/       # Image serving API
│   │   │   ├── text/        # Text file reading API
│   │   │   └── tags/        # Tag management API
│   │   ├── layout.js        # Root layout with Mantine provider
│   │   ├── page.js          # Main application UI
│   │   └── globals.css      # Global styles
│   └── lib/
│       └── db.js            # SQLite database management
├── public/
│   └── config.json          # Application configuration
└── data/
    └── tags.db              # SQLite database (auto-created)
```

## Database Schema

The application uses SQLite with the following tables:

### `tags`
- `id`: Primary key
- `type`: 'image' or 'text'
- `label`: Tag name

### `files`
- `id`: Primary key
- `hash`: SHA256 hash of file content
- `folder`: File directory path
- `filename`: File name

### `files_tags`
- `id`: Primary key
- `fileId`: Foreign key to files
- `tagId`: Foreign key to tags

## Technologies Used

- **Next.js 16**: React framework with App Router and Turbopack
- **React 18**: UI library with hooks
- **Mantine 7**: Component library for UI
- **better-sqlite3**: Synchronous SQLite database
- **Tabler Icons**: Icon library
- **Node.js 22**: Runtime environment

## Supported File Types

### Images
- .jpg, .jpeg
- .png
- .gif
- .bmp
- .webp
- .svg

### Text Files
- .txt, .md
- .json
- .js, .jsx, .ts, .tsx
- .css, .html, .xml
- .log, .csv

## Development

### Building for Production

```bash
npm run build
npm start
```

### Code Structure

- **Frontend**: React components using Mantine UI library
- **Backend**: Next.js API routes for file system operations
- **Database**: SQLite with content-based file hashing
- **State Management**: React hooks (useState, useEffect)

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Author

[Your Name/Organization]