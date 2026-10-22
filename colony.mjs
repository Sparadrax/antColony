/**
 * Pure ant colony engine. A symmetric distance matrix and pheromone matrix describe the complete graph; every ant constructs a closed tour.
 */
/**
 * Sum every edge in a tour, including its closing edge.
 *
 * @param route - Ordered point indices forming a closed tour; each point appears exactly once.
 * @param distances - Pairwise distance matrix indexed by source and destination point.
 * @returns Total length of the closed ant tour, including the return to its starting point.
 */
export function tourLength(route,distances) {
    return route.reduce((sum,node,i)=>sum+distances[node][route[(i+1)%route.length]],0);
}
/**
 * Precompute symmetric distances and initialize uniform pheromone levels.
 *
 * @param points - Point coordinates with x/y components, indexed by route chromosomes.
 * @param random - Random-number source returning a value in [0, 1); used for repeatable tests or randomized generation. Default: Math.random.
 * @returns New colony state with distance and pheromone matrices and no completed tours.
 */
export function createColony(points,random=Math.random) {
    const distances=points.map(a=>points.map(b=>Math.max(.001,Math.hypot(a.x-b.x,a.y-b.y))));
    return {points,distances,pheromones:points.map(()=>new Float64Array(points.length).fill(1)),iteration:0,best:null,tours:[],random};
}
/**
 * Construct probabilistic tours, evaporate old trails, and reinforce short tours.
 *
 * @param colony - Mutable colony state containing points, pheromones, candidate tours, and the best route.
 * @param options - Configuration object (defaults to an empty object).
 * @param options.ants - Number of ant tours constructed in an optimization iteration. Default: 40.
 * @param options.evaporation - Fraction of existing pheromone removed each iteration, from zero to one. Default: .25.
 * @param options.alpha - Exponent controlling how strongly ants favor existing pheromone trails. Default: 1.
 * @param options.beta - Exponent controlling the preference for shorter edges during ant route construction. Default: 3.
 * @returns The same colony state after tour construction, evaporation, and reinforcement.
 */
export function iterate(colony,{ants=40,evaporation=.25,alpha=1,beta=3}={}) {
    const {points,distances,pheromones,random}=colony;
    const tours=[];
    for(let ant=0;ant<ants;ant++) {
        const route=[Math.floor(random()*points.length)],remaining=new Set(points.map((_,i)=>i));remaining.delete(route[0]);
        while(remaining.size) {
            const from=route.at(-1),options=[...remaining];
            const weights=options.map(to=>Math.pow(pheromones[from][to],alpha)/Math.pow(distances[from][to],beta));
            let draw=random()*weights.reduce((sum,w)=>sum+w,0),next=options.at(-1);
            for(let i=0;i<options.length;i++){draw-=weights[i];if(draw<=0){next=options[i];break;}}
            route.push(next);remaining.delete(next);
        }
        const tour={route,length:tourLength(route,distances)};tours.push(tour);
        if(!colony.best || tour.length<colony.best.length)colony.best={route:[...route],length:tour.length};
    }
    for(let a=0;a<points.length;a++)for(let b=0;b<points.length;b++)pheromones[a][b]=Math.max(.001,pheromones[a][b]*(1-evaporation));
    // Shorter tours deposit more pheromone; best-so-far gets an additional deposit.
    for(const tour of [...tours,colony.best])for(let i=0;i<tour.route.length;i++) {
        const a=tour.route[i],b=tour.route[(i+1)%tour.route.length],deposit=100/tour.length;
        pheromones[a][b]=Math.min(100,pheromones[a][b]+deposit);pheromones[b][a]=pheromones[a][b];
    }
    colony.tours=tours;colony.iteration++;return colony;
}
/**
 * Convert normalized tour progress into a point along its distance-weighted edges.
 *
 * @param tour - Closed route and its total length, used to locate a moving ant.
 * @param distances - Pairwise distance matrix indexed by source and destination point.
 * @param points - Point coordinates with x/y components, indexed by route chromosomes.
 * @param progress - Normalized progress around the closed tour; values wrap at one full trip.
 * @returns Interpolated x/y coordinates on the selected tour.
 */
export function sampleAnt(tour,distances,points,progress) {
    let travel=((progress%1)+1)%1*tour.length;
    for(let i=0;i<tour.route.length;i++) {
        const a=tour.route[i],b=tour.route[(i+1)%tour.route.length],length=distances[a][b];
        if(travel<=length){const t=travel/length;return {x:points[a].x+(points[b].x-points[a].x)*t,y:points[a].y+(points[b].y-points[a].y)*t};}
        travel-=length;
    }
    return points[tour.route[0]];
}
