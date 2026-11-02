import { ArrowLeft, BookOpenCheck, Lightbulb, PenLine, Play, ScrollText } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { GPS_ITEMS } from '../english/bank';
import { grammarTopic, TOPIC_GROUPS } from '../english/topics';
import type { GrammarTopicId } from '../english/types';
import { LEVEL_NAME } from '../gen/catalog';
import type { LevelChoice } from '../gen/types';
import type { StartRequest } from '../store/model';
import { RichText } from '../ui/RichText';
import { topicPractice } from './practiceRequests';

interface Props {
  topicId: GrammarTopicId;
  /** The English level chosen on Home. */
  level: LevelChoice;
  onBack: () => void;
  onPractise: (request: StartRequest) => void;
}

/** One grammar topic: what it is, how to form it, what to watch out for, and a practice set. */
export function TopicScreen({ topicId, level, onBack, onPractise }: Props) {
  const topic = grammarTopic(topicId);
  if (!topic) {
    return (
      <div className="page">
        <p>This topic could not be found.</p>
        <Button onClick={onBack}>Home</Button>
      </div>
    );
  }
  const items = GPS_ITEMS.filter((it) => it.topic === topic.id);
  const realPapers = items.filter((it) => it.source?.paper === 'KS2 GPS Paper 1').length;
  const oak = items.filter((it) => it.source?.paper === 'Oak National Academy').length;
  const request = topicPractice(topic.id, level);

  return (
    <div className="page gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden />
          Home
        </Button>
        <Badge tone="english">{TOPIC_GROUPS[topic.group]}</Badge>
      </header>

      <Card className="gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-english-soft text-english">
            <BookOpenCheck className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-3xl leading-tight font-black text-ink">{topic.title}</h1>
            <CardDescription className="mt-1">{topic.blurb}</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {request && (
            <Button variant="primary" size="lg" onClick={() => onPractise(request)}>
              <Play aria-hidden />
              Practise this topic
            </Button>
          )}
          <span className="text-sm text-muted">
            Ten questions · {LEVEL_NAME[level]}
            {realPapers > 0 && ` · ${realPapers} from real SATs papers`}
          </span>
        </div>
      </Card>

      {topic.learn.map((block, i) => {
        const watch = /watch|careful|mistake|slip/i.test(block.heading);
        return (
          <Card key={i} className={watch ? 'border-warn/40 bg-warn-soft/40' : undefined}>
            <CardTitle className="flex items-center gap-2">
              {watch ? <Lightbulb className="size-5 text-warn-ink" aria-hidden /> : <PenLine className="size-5 text-english" aria-hidden />}
              {block.heading}
            </CardTitle>
            <RichText className="m-0 text-lg leading-relaxed" text={block.text} />
            {block.examples && block.examples.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {block.examples.map((ex, k) => (
                  <li key={k} className="rounded-xl bg-page px-4 py-2 text-lg">
                    <RichText className="m-0" text={ex} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Card className="border-english/20 bg-english-soft/50">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-5 text-english" aria-hidden />
          In the test
        </CardTitle>
        <RichText className="m-0 text-lg leading-relaxed" text={topic.inTheTest} />
        {request && (
          <div>
            <Button variant="primary" size="lg" onClick={() => onPractise(request)}>
              <Play aria-hidden />
              Practise this topic
            </Button>
          </div>
        )}
      </Card>

      {Boolean(topic.sources?.length || realPapers || oak) && (
        <p className="m-0 text-sm text-muted">
          {topic.sources?.length ? `Based on: ${topic.sources.join('; ')}. ` : ''}
          {realPapers > 0 && `${realPapers} practice questions are from past KS2 tests (Crown copyright, Open Government Licence v3.0). `}
          {oak > 0 && `${oak} are from Oak National Academy lessons (Open Government Licence v3.0).`}
        </p>
      )}
    </div>
  );
}
