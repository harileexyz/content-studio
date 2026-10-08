import { useEffect, useState } from "react";
import { Check, CheckCircle2, Film, Image, Link2, History } from "lucide-react";
import type { PackView, ReviseInput, ApproveInput } from "../../shared/models";
export function PackReview({
  pack,
  busy,
  onRevise,
  onApprove,
  onOpenSource,
}: {
  pack: PackView;
  busy: boolean;
  onRevise: (input: ReviseInput) => Promise<void>;
  onApprove: (input: ApproveInput) => Promise<void>;
  onOpenSource: (index: number) => Promise<void>;
}) {
  const target = pack.targets.find(
    (t) => t.destination === "instagram_feed_post",
  )!;
  const [caption, setCaption] = useState(target.caption);
  useEffect(() => setCaption(target.caption), [pack.id, target.caption]);
  const dirty = caption.trim() !== target.caption;
  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <div className="review-meta">
            <span className="badge">
              {pack.sample ? "Sample pack" : "Research draft"}
            </span>
            <span>Version {pack.revision}</span>
          </div>
          <h1>{pack.research?.title ?? pack.topic}</h1>
          <p>
            Review the work and exact caption before approving a destination.
          </p>
        </div>
        <span className="creation-date">
          {new Date(pack.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="review-layout">
        <div className="media-column">
          <div className="graphic-frame">
            {pack.graphicPreview ? (
              <img
                src={pack.graphicPreview}
                alt={`Draft feed graphic about ${pack.topic}`}
              />
            ) : (
              <div className="missing-asset">
                <Image />
                <p>{pack.assetError ?? "The graphic is unavailable."}</p>
              </div>
            )}
          </div>
          <div className="asset-caption">
            <span>
              <Image size={15} /> Instagram feed graphic
            </span>
            <span>1080 × 1350 · SVG</span>
          </div>
          <div className="video-pending">
            <Film size={23} />
            <div>
              <strong>Video creation comes next</strong>
              <p>No video has been generated for this pack.</p>
            </div>
          </div>
        </div>
        <div className="review-controls">
          {pack.research && (
            <section className="script-panel">
              <h2>Video script</h2>
              <p>{pack.research.script}</p>
              <small>
                {pack.research.kind === "news"
                  ? "Event date: " + pack.research.eventDate
                  : "Evergreen guide"}{" "}
                · Drafted with {pack.model ?? "Codex"}
              </small>
            </section>
          )}
          <div className="caption-panel">
            <div className="panel-title">
              <h2>Caption</h2>
              <span className="muted">Instagram feed</span>
            </div>
            <label className="sr-only" htmlFor="feed-caption">
              Instagram feed caption
            </label>
            <textarea
              id="feed-caption"
              rows={7}
              maxLength={2200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="caption-actions">
              <span className="muted">
                {dirty ? "Unsaved changes" : "Saved with this version"}
              </span>
              <button
                className="secondary"
                disabled={busy || !dirty || !caption.trim()}
                onClick={() =>
                  void onRevise({
                    packId: pack.id,
                    targetId: target.id,
                    expectedRevision: pack.revision,
                    caption,
                  })
                }
              >
                Save caption
              </button>
            </div>
          </div>
          <div className="destination-panel">
            <h2>Destinations</h2>
            <div className="destination">
              <div>
                <Image size={18} />
                <span>
                  <strong>Instagram feed post</strong>
                  <small>
                    {pack.assetError
                      ? "Asset needs a new review"
                      : target.approval
                        ? "Approved for this version"
                        : "Ready for your review"}
                  </small>
                </span>
              </div>
              <button
                className={
                  target.approval && !pack.assetError
                    ? "approved-button"
                    : "primary compact"
                }
                disabled={
                  busy || dirty || !pack.graphicPreview || !!target.approval
                }
                onClick={() =>
                  void onApprove({
                    packId: pack.id,
                    targetId: target.id,
                    expectedRevision: pack.revision,
                  })
                }
              >
                {target.approval ? (
                  <>
                    <Check size={16} />
                    Approved
                  </>
                ) : (
                  "Approve graphic"
                )}
              </button>
            </div>
            {pack.targets
              .filter((t) => t.destination !== "instagram_feed_post")
              .map((t) => (
                <div className="destination unavailable" key={t.id}>
                  <div>
                    <Film size={18} />
                    <span>
                      <strong>
                        {t.destination === "youtube_short"
                          ? "YouTube Short"
                          : "Instagram Reel"}
                      </strong>
                      <small>Waiting for a video asset</small>
                    </span>
                  </div>
                  <button className="secondary compact" disabled>
                    Approve video
                  </button>
                  <details className="video-caption">
                    <summary>
                      View{" "}
                      {t.destination === "youtube_short" ? "YouTube" : "Reel"}{" "}
                      caption
                    </summary>
                    <p>{t.caption}</p>
                  </details>
                </div>
              ))}
            <p className="approval-note">
              <CheckCircle2 size={16} />
              Approval covers this exact graphic and caption. It does not
              publish anything.
            </p>
          </div>
          <div className="source-panel">
            <h2>
              <Link2 size={18} />
              Source evidence
            </h2>
            {pack.research ? (
              <>
                <p>
                  Primary pages opened by Codex. Review the claims before using
                  this draft.
                </p>
                {pack.sources.map((source, index) => (
                  <div className="source-entry" key={source.url}>
                    <button
                      className="text-button"
                      onClick={() =>
                        void onOpenSource(index).catch(() =>
                          alert("The source could not be opened."),
                        )
                      }
                    >
                      {index + 1}. {source.title ?? source.url}
                    </button>
                    <p>{source.claim}</p>
                    <small>
                      {new URL(source.url).hostname} ·{" "}
                      {source.openedByCodex
                        ? "Page opening observed"
                        : "Opening not observed"}
                    </small>
                  </div>
                ))}
                <h3>Limitations</h3>
                {pack.research.limitations.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </>
            ) : (
              <p>
                This is a layout sample. No research or factual claims have been
                generated.
              </p>
            )}
          </div>
          {pack.history.length > 0 && (
            <details className="revision-panel">
              <summary>
                <History size={17} />
                Revision history ({pack.history.length})
              </summary>
              {[...pack.history].reverse().map((revision) => (
                <div key={revision.revision}>
                  <strong>Version {revision.revision}</strong>
                  <p>
                    {
                      revision.targets.find(
                        (t) => t.destination === "instagram_feed_post",
                      )?.caption
                    }
                  </p>
                </div>
              ))}
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
