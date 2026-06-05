update public.card_templates
set category = values.category
from (
  values
    ('garrett-prime', 'BASED'),
    ('mwyi', 'MINOR'),
    ('necrps-drunken-dad', 'BASED'),
    ('white-monster', 'BASED'),
    ('the-bong', 'AMERICAN'),
    ('assault-rifle', 'AMERICAN'),
    ('zubr-beer', 'BASED'),
    ('rowletforsenator', 'AMERICAN'),
    ('charlie-kirk', 'AMERICAN'),
    ('tyler-robinson', 'AMERICAN'),
    ('vanessa', 'AMERICAN'),
    ('tom-macdonald', 'AMERICAN'),
    ('florida', 'AMERICAN'),
    ('texas', 'AMERICAN')
) as values(slug, category)
where card_templates.slug = values.slug;
