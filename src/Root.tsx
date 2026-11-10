import React from 'react';
import {Composition} from 'remotion';
import {PPSReel, buildTimeline} from './PPSReel';
import {PPSLearn, learnTimeline, LearnContent} from './PPSLearn';
import {PPS3DTest, FLY_DURATION} from './three/PPS3DTest';
import {PPS3DLearn, LEARN3D_DURATION, Learn3DContent} from './three/PPS3DLearn';
import {EntralpiLearn, entralpiTimeline, EntralpiContent} from './EntralpiLearn';
import pps from '../data/pps.json';
import entralpi from '../data/entralpi-learn.json';
import pps3dLearn from '../data/pps-3d-learn.json';
import ppsLearn from '../data/pps-learn.json';
import ppsLearnWeb from '../data/pps-learn-web.json';
import {RankReel, rankDuration, RankContent} from './RankReel';
import rank from '../data/rank.json';
import rankFitness from '../data/rank-fitness.json';
import {SplitReel, splitTimeline, SplitContent} from './SplitReel';
import pinch from '../data/pinch.json';
import {MuscleTest, MuscleTestContent, muscleTestDuration} from './MuscleOverlay';
import pronTest from '../data/pron-test.json';
import {ElbowReel, elbowParts, ElbowContent} from './ElbowReel';
import elbow from '../data/elbow.json';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Version A: product ad */}
    <Composition
      id="pps"
      component={PPSReel}
      durationInFrames={buildTimeline(pps).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: pps}}
      calculateMetadata={({props}) => ({durationInFrames: buildTimeline(props.content).total})}
    />
    {/* Version B: how-to, no selling */}
    <Composition
      id="pps-learn"
      component={PPSLearn}
      durationInFrames={learnTimeline(ppsLearn as LearnContent).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: ppsLearn as LearnContent}}
      calculateMetadata={({props}) => ({durationInFrames: learnTimeline(props.content).total})}
    />
    {/* Version B2 for the product page: no "save this" line */}
    <Composition id="pps-learn-web" component={PPSLearn} durationInFrames={learnTimeline(ppsLearnWeb as LearnContent).total} fps={30} width={1080} height={1920} defaultProps={{content: ppsLearnWeb as LearnContent}} />
    {/* 3D style test */}
    <Composition id="pps-3d-test" component={PPS3DTest} durationInFrames={FLY_DURATION} fps={30} width={1080} height={1920} />
    {/* Version C: how-to in 3D (from CAD) */}
    <Composition id="pps-3d-learn" component={PPS3DLearn} durationInFrames={LEARN3D_DURATION} fps={30} width={1080} height={1920} defaultProps={{content: pps3dLearn as Learn3DContent}} />
    {/* Entralpi: hangboard at your level */}
    {/* Engagement: rank these (one loop clip + overlay) */}
    <Composition id="rank" component={RankReel} durationInFrames={rankDuration(rank as RankContent)} fps={30} width={1080} height={1920} defaultProps={{content: rank as RankContent}} />
    <Composition id="rank-fitness" component={RankReel} durationInFrames={rankDuration(rankFitness as RankContent)} fps={30} width={1080} height={1920} defaultProps={{content: rankFitness as RankContent}} />
    {/* Split-screen how-to: pinch dynamic vs isometric */}
    <Composition id="pinch" component={SplitReel} durationInFrames={splitTimeline(pinch as SplitContent).total} fps={30} width={1080} height={1920} defaultProps={{content: pinch as SplitContent}} />
    <Composition id="pron-test" component={MuscleTest} durationInFrames={muscleTestDuration(pronTest as unknown as MuscleTestContent)} fps={30} width={1080} height={1920} defaultProps={{content: pronTest as unknown as MuscleTestContent}} />
    <Composition id="elbow" component={ElbowReel} durationInFrames={elbowParts(elbow as unknown as ElbowContent).total} fps={30} width={1080} height={1920} defaultProps={{content: elbow as unknown as ElbowContent}} />
    <Composition id="entralpi-learn" component={EntralpiLearn} durationInFrames={entralpiTimeline(entralpi as EntralpiContent).total} fps={30} width={1080} height={1920} defaultProps={{content: entralpi as EntralpiContent}} />
  </>
);
