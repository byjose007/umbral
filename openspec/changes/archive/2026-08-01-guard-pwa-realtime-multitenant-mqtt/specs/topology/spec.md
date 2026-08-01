## MODIFIED Requirements

### Requirement: Modelo de instalación física

El sistema SHALL permitir modelar la instalación como una jerarquía de
organizaciones, sitios, zonas, puertas, controladores y lectores, de modo que cada
sitio pertenezca a exactamente una organización y cada puerta pertenezca a un sitio
y esté gobernada por exactamente un controlador y un perfil de cerradura.

#### Scenario: Alta de un sitio con su zona raíz

- **DADO** un administrador con permiso de configuración de topología
- **CUANDO** crea un sitio con código único y zona horaria
- **ENTONCES** el sistema persiste el sitio y permite colgar zonas de él
- **Y** el código del sitio es único dentro de la instalación

#### Scenario: Todo sitio pertenece a una organización

- **DADO** una organización existente
- **CUANDO** se crea un sitio asociado a esa organización
- **ENTONCES** el sistema rechaza el alta si la organización indicada no existe
- **Y** un sitio sin organización explícita queda asociado a la organización por
  defecto

#### Scenario: Jerarquía de zonas

- **DADO** un sitio existente
- **CUANDO** se crea una zona con `parent_id` apuntando a otra zona del mismo sitio
- **ENTONCES** el sistema acepta la relación jerárquica padre-hija
- **Y** rechaza una zona cuyo `parent_id` pertenezca a otro sitio

#### Scenario: Una puerta referencia controlador y perfil

- **CUANDO** se crea una puerta
- **ENTONCES** el sistema exige un `controller_id`, un `lock_profile_id` y una
  `zone_inside_id` válidos
- **Y** rechaza la puerta si falta cualquiera de las tres referencias
