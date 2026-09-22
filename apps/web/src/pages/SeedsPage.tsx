import { SeedCard } from '../components/seeds/SeedCard';

export function SeedsPage() {
  return (
    <>
      <section className="page-heading">
        <div>
          <h1>种草清单</h1>
          <p>刷到的好东西都先种在这里，有空的时候来拔一棵 🌱</p>
        </div>
      </section>
      <SeedCard />
    </>
  );
}
