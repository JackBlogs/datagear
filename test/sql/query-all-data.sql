-- =============================================================================
-- dg_test 数据库 - SQL 数据集查询（DataGear 兼容，单条 SQL）
-- -----------------------------------------------------------------------------
-- 数据源：test/config/test.properties  →  jdbc:mysql://127.0.0.1:3306/dg_test
--
-- 【重要】DataGear 的「SQL 数据集」只允许写【一条 SQL 语句（单个 SELECT）】：
--   1. 不要写 USE dg_test;（数据集已绑定数据源，无需选择库）
--   2. 不要写多条 SELECT（每条查询需单独建一个数据集）
--   3. 不要以分号结尾（可选，写一条 SELECT 即可）
--
-- 下面这条查询返回核心业务数据：账号 + 住址（一对一的关联查询）。
-- 如需查询其它表，把 FROM 后面的表名换成对应表即可，例如：
--   SELECT * FROM T_PRODUCT;
--   SELECT * FROM t_dept;
-- =============================================================================

SELECT
    a.ID            AS 账号ID,
    a.NAME          AS 账号名,
    a.INTRODUCTION  AS 自我介绍,
    d.CITY          AS 城市,
    d.STREET        AS 街道,
    d.RESIDENTIAL   AS 住宅区,
    d.HOUSE_NUMBER  AS 门牌号
FROM T_ACCOUNT a
LEFT JOIN T_ADDRESS d ON d.ACCOUNT_ID = a.ID
ORDER BY a.ID
