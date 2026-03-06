import { Activity } from 'lucide-react';

interface CourseRadarChartProps {
    data: number[];
    labels: string[];
}

export function CourseRadarChart({ data, labels }: CourseRadarChartProps) {
    const center = 100;
    const maxRadius = 65;

    const getPoint = (value: number, angleIndex: number) => {
        const angle = (Math.PI / 3) * angleIndex - Math.PI / 2;
        const r = (value / 5) * maxRadius;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    };

    const polygonPoints = data.map((v, i) => getPoint(v, i)).join(" ");
    const guides = [1, 2, 3, 4, 5].map(level => (
        data.map((_, i) => getPoint(level, i)).join(" ")
    ));

    return (
        <div className="flex-1 flex flex-col justify-center items-center py-2 w-full">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest w-full flex items-center justify-center md:justify-start mb-6 md:ml-4">
                <Activity className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                Course Analytics
            </h3>

            <div className="relative w-full max-w-[260px] sm:max-w-[300px] mx-auto aspect-square z-10">
                <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                    {guides.map((pts, i) => (
                        <polygon
                            key={i}
                            points={pts}
                            fill={i === 4 ? "rgba(255,255,255,0.4)" : "none"}
                            stroke="currentColor"
                            className="text-slate-200"
                            strokeWidth="1"
                        />
                    ))}
                    {data.map((_, i) => (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={center + maxRadius * Math.cos((Math.PI / 3) * i - Math.PI / 2)}
                            y2={center + maxRadius * Math.sin((Math.PI / 3) * i - Math.PI / 2)}
                            stroke="currentColor"
                            className="text-slate-200"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                        />
                    ))}

                    <polygon
                        points={polygonPoints}
                        className="fill-indigo-500/10 stroke-indigo-400 transition-all duration-1000 ease-out"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {data.map((v, i) => {
                        const pt = getPoint(v, i).split(",");
                        return (
                            <circle key={i} cx={pt[0]} cy={pt[1]} r="3" className="fill-white stroke-indigo-400" strokeWidth="1.5" />
                        );
                    })}

                    {labels.map((label, i) => {
                        const angle = (Math.PI / 3) * i - Math.PI / 2;
                        const r = maxRadius + 18;

                        return (
                            <text
                                key={i}
                                x={center + r * Math.cos(angle)}
                                y={center + r * Math.sin(angle) + 1}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                className="fill-slate-500 font-medium text-[10px] sm:text-[11px] tracking-tight cursor-default"
                            >
                                {label}
                            </text>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
