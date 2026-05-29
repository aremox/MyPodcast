// Testing image URL extraction logic
// Let's do a direct test of the extraction functions using the logic from rss-parser.service.ts:

function extractFeedImageUrl(feed) {
  if (feed.itunesImage?.href) return feed.itunesImage.href;
  if (feed.itunesImage?.$?.href) return feed.itunesImage.$.href;
  if (feed.itunesImage && typeof feed.itunesImage === 'string') return feed.itunesImage;
  if (feed.image?.url) return feed.image.url;
  return '';
}

const mockFeed = {
  itunesImage: {
    '$': {
      href: 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/12673262/12673262-1613269918170-3ef9faf0802a5.jpg'
    }
  }
};

const imageUrl = extractFeedImageUrl(mockFeed);
console.log('Extracted Image URL:', imageUrl);
if (imageUrl === 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/12673262/12673262-1613269918170-3ef9faf0802a5.jpg') {
  console.log('SUCCESS: Image URL extracted correctly!');
} else {
  console.log('FAILURE: Extraction returned:', imageUrl);
}
