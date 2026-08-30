import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FINAL_URL="https://zad-alkhair.net/";
const ALLOWED_ORIGINS=new Set([
  "https://ayman-alashkar.github.io",
  "https://zad-alkhair.net"
]);

function headers(origin:string|null){
  const allowed=origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://zad-alkhair.net";
  return {
    "Access-Control-Allow-Origin":allowed,
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Max-Age":"600",
    "Cache-Control":"no-store",
    "Content-Type":"application/json; charset=utf-8",
    "Referrer-Policy":"no-referrer",
    "Vary":"Origin"
  };
}

Deno.serve((req:Request)=>{
  const origin=req.headers.get("origin");
  if(origin&&!ALLOWED_ORIGINS.has(origin)){
    return new Response(JSON.stringify({error:"origin_not_allowed"}),{
      status:403,
      headers:headers(null)
    });
  }

  if(req.method==="OPTIONS"){
    return new Response(null,{status:204,headers:headers(origin)});
  }

  return new Response(JSON.stringify({
    error:"migration_retired",
    url:FINAL_URL
  }),{
    status:410,
    headers:headers(origin)
  });
});
