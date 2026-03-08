; ZAX lowered .asm trace
; range: $0000..$0068 (end exclusive)

; func inc_one begin
inc_one:
push IX                        ; 0000: DD E5
ld IX, $0000                   ; 0002: DD 21 00 00
add IX, SP                     ; 0006: DD 39
ld HL, $0022                   ; 0008: 21 22 00
push HL                        ; 000B: E5
ld HL, $0033                   ; 000C: 21 33 00
push HL                        ; 000F: E5
push AF                        ; 0010: F5
push BC                        ; 0011: C5
push DE                        ; 0012: D5
ld E, (IX + $0004)             ; 0013: DD 5E 04
ld D, (IX + $0005)             ; 0016: DD 56 05
inc DE                         ; 0019: 13
ld (IX - $0002), E             ; 001A: DD 73 FE
ld (IX - $0001), D             ; 001D: DD 72 FF
ld E, (IX - $0002)             ; 0020: DD 5E FE
ld D, (IX - $0001)             ; 0023: DD 56 FF
ex DE, HL                      ; 0026: EB
__zax_epilogue_0:
pop DE                         ; 0027: D1
pop BC                         ; 0028: C1
pop AF                         ; 0029: F1
ld SP, IX                      ; 002A: DD F9
pop IX                         ; 002C: DD E1
ret                            ; 002E: C9
; func inc_one end
; func main begin
main:
push IX                        ; 002F: DD E5
ld IX, $0000                   ; 0031: DD 21 00 00
add IX, SP                     ; 0035: DD 39
push HL                        ; 0037: E5
ld HL, $0011                   ; 0038: 21 11 00
ex (SP), HL                    ; 003B: E3
push AF                        ; 003C: F5
push BC                        ; 003D: C5
push DE                        ; 003E: D5
push HL                        ; 003F: E5
ld HL, $0044                   ; 0040: 21 44 00
push HL                        ; 0043: E5
call inc_one                   ; 0044: CD 00 00
inc SP                         ; 0047: 33
inc SP                         ; 0048: 33
push DE                        ; 0049: D5
ex DE, HL                      ; 004A: EB
push AF                        ; 004B: F5
push BC                        ; 004C: C5
push DE                        ; 004D: D5
push IX                        ; 004E: DD E5
pop HL                         ; 0050: E1
ld DE, $FFFE                   ; 0051: 11 FE FF
add HL, DE                     ; 0054: 19
push HL                        ; 0055: E5
pop HL                         ; 0056: E1
pop DE                         ; 0057: D1
pop BC                         ; 0058: C1
pop AF                         ; 0059: F1
ld (hl), E                     ; 005A: 73
inc HL                         ; 005B: 23
ld (hl), D                     ; 005C: 72
ex DE, HL                      ; 005D: EB
pop DE                         ; 005E: D1
__zax_epilogue_1:
pop HL                         ; 005F: E1
pop DE                         ; 0060: D1
pop BC                         ; 0061: C1
pop AF                         ; 0062: F1
ld SP, IX                      ; 0063: DD F9
pop IX                         ; 0065: DD E1
ret                            ; 0067: C9
; func main end

; symbols:
; label inc_one = $0000
; label __zax_epilogue_0 = $0027
; label main = $002F
; label __zax_epilogue_1 = $005F
