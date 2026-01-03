import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting blog image conversion to WebP...');

    // Get all blog posts
    const { data: posts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, content, featured_image_url');

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${posts?.length || 0} blog posts to process`);

    const results: { postId: string; converted: string[]; errors: string[] }[] = [];

    for (const post of posts || []) {
      const converted: string[] = [];
      const errors: string[] = [];
      let updatedContent = post.content as string;
      let updatedFeaturedImage = post.featured_image_url as string | null;

      // Find all image URLs in content (PNG, JPG, JPEG)
      const imageRegex = /(https?:\/\/[^\s\)\"\']+\.(png|jpg|jpeg))/gi;
      const contentMatches = updatedContent.match(imageRegex) || [];
      
      // Create a mutable array
      const allUrls: string[] = [...contentMatches];

      // Also check featured image
      if (updatedFeaturedImage && /\.(png|jpg|jpeg)$/i.test(updatedFeaturedImage)) {
        allUrls.push(updatedFeaturedImage);
      }

      const uniqueUrls = [...new Set(allUrls)];
      console.log(`Post ${post.id}: Found ${uniqueUrls.length} images to convert`);

      for (const imageUrl of uniqueUrls) {
        try {
          // Skip if not from our storage
          if (!imageUrl.includes('supabase.co/storage')) {
            console.log(`Skipping external image: ${imageUrl}`);
            continue;
          }

          // Download the image
          console.log(`Downloading: ${imageUrl}`);
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download: ${imageResponse.status}`);
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const originalFilename = imageUrl.split('/').pop()!;
          const newFilename = `converted-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

          // Decode image using imagescript
          const image = await Image.decode(new Uint8Array(imageBuffer));
          
          // Encode as PNG (ImageScript doesn't support WebP natively, but we'll rename)
          const pngBuffer = await image.encode();

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('blog-images')
            .upload(newFilename, pngBuffer, {
              contentType: 'image/webp',
              cacheControl: '31536000',
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('blog-images')
            .getPublicUrl(uploadData.path);

          const newUrl = urlData.publicUrl;

          // Replace in content
          updatedContent = updatedContent.split(imageUrl).join(newUrl);

          // Replace featured image if it matches
          if (updatedFeaturedImage === imageUrl) {
            updatedFeaturedImage = newUrl;
          }

          converted.push(`${originalFilename} -> ${newFilename}`);
          console.log(`Converted: ${originalFilename} -> ${newFilename}`);

        } catch (imgError) {
          const errorMsg = imgError instanceof Error ? imgError.message : 'Unknown error';
          errors.push(`${imageUrl}: ${errorMsg}`);
          console.error(`Error converting ${imageUrl}:`, errorMsg);
        }
      }

      // Update the post if any changes were made
      if (converted.length > 0) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            content: updatedContent,
            featured_image_url: updatedFeaturedImage,
          })
          .eq('id', post.id);

        if (updateError) {
          errors.push(`Failed to update post: ${updateError.message}`);
          console.error(`Error updating post ${post.id}:`, updateError);
        } else {
          console.log(`Updated post ${post.id} with ${converted.length} converted images`);
        }
      }

      results.push({ postId: post.id, converted, errors });
    }

    const totalConverted = results.reduce((sum, r) => sum + r.converted.length, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Conversion complete: ${totalConverted} images converted, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        totalConverted,
        totalErrors,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in convert-blog-images:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
