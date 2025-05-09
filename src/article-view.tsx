import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchArticleDetail, extractArticleId } from "./api/client";
import { formatDate } from "./utils/formatDate";

interface ArticleViewProps {
  articleUrl: string;
  articleTitle: string;
}

export default function ArticleView(props: ArticleViewProps) {
  const { articleUrl, articleTitle } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticleContent() {
      try {
        setIsLoading(true);
        const articleId = extractArticleId(articleUrl);

        if (!articleId) {
          setError("Could not extract article ID from URL");
          setIsLoading(false);
          return;
        }

        const data = await fetchArticleDetail(articleId);
        setArticle(data);
      } catch (err) {
        setError(
          `Error loading article: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticleContent();
  }, [articleUrl]);

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

  // Generate markdown for the article
  function generateArticleMarkdown() {
    if (error) {
      return `# Error\n\n${error}`;
    }

    if (!article) {
      return `# ${articleTitle}\n\nLoading article preview...`;
    }

    // Extract article details
    const title = article.titulo || articleTitle;
    const lead = article.lead || "";
    const publishedDate = article.data
      ? formatDate(article.data)
      : "Not available";
    const authors = formatAuthors(article.autores);

    // Check if body content exists
    const hasContent = article.body && article.body.trim().length > 0;

    // Build markdown content
    return `# ${title}

*${authors} • ${publishedDate}*

${lead ? `**${lead}**\n\n` : ""}

${
  hasContent
    ? article.body.replace(/<[^>]*>/g, "")
    : 'Para ler o artigo completo, por favor clique em "Abrir no Navegador".\n\n*O conteúdo completo deste artigo só está disponível no site do Publico.*'
}
`;
  }

  return (
    <Detail
      markdown={generateArticleMarkdown()}
      isLoading={isLoading}
      navigationTitle={articleTitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={articleUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={articleUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
