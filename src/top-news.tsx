import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchTopNews } from "./api/client";
import { Article } from "./api/type";
import { formatDate } from "./utils/formatDate";
import ArticleView from "./article-view";

// Maximum number of tags to display
const MAX_TAGS = 6;

export default function Command() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch articles on component mount
  useEffect(() => {
    fetchArticles();
  }, []);

  // Fetch top news
  async function fetchArticles() {
    try {
      setIsLoading(true);
      const data = await fetchTopNews();
      setArticles(data);
    } catch (error) {
      console.error("Error fetching top news:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Get proper URL from article
  function getArticleUrl(article: Article): string {
    // First priority: use fullUrl if available
    if (article.fullUrl) {
      return article.fullUrl;
    }

    // Second priority: use and fix url if available
    if (article.url) {
      let fixedUrl = article.url;

      if (fixedUrl.includes("https://www.publico.pthttps//")) {
        fixedUrl = fixedUrl.replace(
          "https://www.publico.pthttps//",
          "https://",
        );
      }

      if (fixedUrl.includes("https://www.publico.pthttps/")) {
        fixedUrl = fixedUrl.replace("https://www.publico.pthttps/", "https://");
      }

      fixedUrl = fixedUrl.replace("https//", "https://");

      if (!fixedUrl.includes("publico.pt") && !fixedUrl.startsWith("http")) {
        fixedUrl = `https://www.publico.pt${fixedUrl.startsWith("/") ? "" : "/"}${fixedUrl}`;
      }

      return fixedUrl;
    }

    // Fallback: return the Publico homepage
    return "https://www.publico.pt";
  }

  // Clean up description by removing the "há X horas ... " prefix
  function cleanDescription(description: string | undefined): string {
    if (!description) return "";

    // More comprehensive pattern to catch various forms
    // This handles both "há" and "hÃ¡" and different spacing/formatting
    const patterns = [
      /^(há|hÃ¡)\s+\d+\s+(horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
      /^h[aá]\s+\d+\s+(?:horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
    ];

    let cleanedDesc = description;

    for (const pattern of patterns) {
      const match = cleanedDesc.match(pattern);
      if (match) {
        cleanedDesc = cleanedDesc.substring(match[0].length);
        break;
      }
    }

    return cleanedDesc;
  }

  // Format authors from the autores array
  function formatAuthors(autores: any): string {
    if (!autores) return "Not available";

    // If autores is an array, extract nome from each author
    if (Array.isArray(autores)) {
      const authorNames = autores
        .filter(
          (author) => author && (typeof author === "string" || author.nome),
        )
        .map((author) => (typeof author === "string" ? author : author.nome));
      return authorNames.length > 0 ? authorNames.join(", ") : "Not available";
    }

    // If autores is an object with nome property
    if (typeof autores === "object" && autores !== null) {
      if (autores.nome) return autores.nome;
      if (autores.name) return autores.name;
    }

    // If autores is a string
    if (typeof autores === "string") {
      return autores;
    }

    return "Not available";
  }

  // Extract tags for keywords - returns array of tags
  function extractTags(tags: any): string[] {
    if (!tags) return [];

    if (Array.isArray(tags)) {
      // Try to extract tag names if they are objects
      try {
        return tags
          .map((tag) => {
            if (typeof tag === "string") return tag;
            if (typeof tag === "object" && tag !== null) {
              // Try to get a meaningful property from the tag object
              return (
                tag.nome ||
                tag.name ||
                tag.value ||
                tag.titulo ||
                tag.title ||
                (tag.toString && tag.toString() !== "[object Object]"
                  ? tag.toString()
                  : "")
              );
            }
            return String(tag);
          })
          .filter(
            (tag) =>
              tag &&
              tag !== "undefined" &&
              tag !== "null" &&
              tag !== "[object Object]",
          );
      } catch (e) {
        console.error("Error extracting tags:", e);
        return [];
      }
    }

    if (typeof tags === "string") {
      return [tags];
    }

    return [];
  }

  // Get tag color
  function getTagColor(index: number): Color.ColorLike {
    const colors = [
      "#B22222", // FireBrick
      "#4B0082", // Indigo
      "#006400", // DarkGreen
      "#8B4513", // SaddleBrown
      "#4682B4", // SteelBlue
      "#800080", // Purple
      "#FF8C00", // DarkOrange
      "#2F4F4F", // DarkSlateGray
    ];

    return colors[index % colors.length];
  }

  // Get image URL or fallback to first letter
  function getArticleIcon(
    article: Article,
  ): { source: string } | { text: string; tintColor: string } {
    // Priority 1: Check for multimediaPrincipal (directly as a string)
    if (
      article.multimediaPrincipal &&
      typeof article.multimediaPrincipal === "string"
    ) {
      return { source: article.multimediaPrincipal };
    }

    // Priority 2: Check for multimediaPrincipal as an object
    if (
      article.multimediaPrincipal &&
      typeof article.multimediaPrincipal === "object" &&
      article.multimediaPrincipal.src
    ) {
      return { source: article.multimediaPrincipal.src };
    }

    // Priority 3: Check for imagem
    if (
      article.imagem &&
      typeof article.imagem === "object" &&
      article.imagem.src
    ) {
      return { source: article.imagem.src };
    }

    // Fallback to first letter icon
    const letter = article.titulo
      ? article.titulo.charAt(0).toUpperCase()
      : "P";
    return { text: letter, tintColor: "#1E90FF" };
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {articles.map((article, index) => {
        const cleanTitle =
          article.titulo?.replace(/<[^>]*>/g, "") || "Untitled";

        // Format authors
        const authorText = formatAuthors(article.autores);

        // Extract tags for keywords and limit to MAX_TAGS
        const allTags = extractTags(article.tags);
        const tags = allTags.slice(0, MAX_TAGS);

        // Format published date from data field
        const publishedDate = article.data
          ? article.data.includes("0001-01-01")
            ? "Not available"
            : formatDate(article.data)
          : article.time
            ? formatDate(article.time)
            : "Not available";

        // Get article icon (image or letter)
        const icon = getArticleIcon(article);

        // Clean up description
        const cleanedDescription = cleanDescription(article.descricao);

        // Prepare the markdown for the detail view with a separator line
        const detailMarkdown = `
# ${cleanTitle}

---

${cleanedDescription}
`;

        // Get the article URL, preferring fullUrl
        const articleUrl = getArticleUrl(article);

        return (
          <List.Item
            key={`article-${index}`}
            icon={icon}
            title={cleanTitle}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* Author row - Updated label */}
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={authorText}
                    />

                    {/* Published date row */}
                    <List.Item.Detail.Metadata.Label
                      title="Published"
                      text={publishedDate}
                    />

                    {/* Keywords as tags */}
                    {tags.length > 0 ? (
                      <List.Item.Detail.Metadata.TagList title="Keywords">
                        {tags.map((tag, tagIndex) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={`tag-${tagIndex}`}
                            text={tag}
                            color={getTagColor(tagIndex)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label
                        title="Tópicos"
                        text="Not available"
                        icon={Icon.Tag}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={articleUrl}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={articleUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
