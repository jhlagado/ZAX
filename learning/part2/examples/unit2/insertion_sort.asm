; ZAX lowered .asm trace
; range: $0100..$8061 (end exclusive)

; func insert_hole begin
insert_hole:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
ld HL, $0000                   ; 0109: 21 00 00
ex (SP), HL                    ; 010C: E3
push HL                        ; 010D: E5
ld HL, $0000                   ; 010E: 21 00 00
ex (SP), HL                    ; 0111: E3
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
ld A, (ix+$04)                 ; 0116: DD 7E 04
or A                           ; 0119: B7
jp nz, __zax_if_else_1         ; 011A: C2 00 00
ld L, $0000                    ; 011D: 2E 00
ld A, (ix+$06)                 ; 011F: DD 7E 06
push DE                        ; 0122: D5
push HL                        ; 0123: E5
ld de, values                  ; 0124: 11 00 00
ld H, $0000                    ; 0127: 26 00
ld L, L                        ; 0129: 6D
add HL, DE                     ; 012A: 19
ld (HL), A                     ; 012B: 77
pop HL                         ; 012C: E1
pop DE                         ; 012D: D1
jp __zax_epilogue_0            ; 012E: C3 00 00
__zax_if_else_1:
push AF                        ; 0131: F5
ld A, (ix+$04)                 ; 0132: DD 7E 04
ld (ix-$02), A                 ; 0135: DD 77 FE
pop AF                         ; 0138: F1
push DE                        ; 0139: D5
ld E, (IX - $0002)             ; 013A: DD 5E FE
dec E                          ; 013D: 1D
ld (IX - $0002), E             ; 013E: DD 73 FE
pop DE                         ; 0141: D1
ex DE, HL                      ; 0142: EB
ld E, (IX - $0002)             ; 0143: DD 5E FE
ex DE, HL                      ; 0146: EB
push DE                        ; 0147: D5
push HL                        ; 0148: E5
ld de, values                  ; 0149: 11 00 00
ld H, $0000                    ; 014C: 26 00
ld L, L                        ; 014E: 6D
add HL, DE                     ; 014F: 19
ld A, (HL)                     ; 0150: 7E
pop HL                         ; 0151: E1
pop DE                         ; 0152: D1
ld (ix-$04), A                 ; 0153: DD 77 FC
ld A, (ix-$04)                 ; 0156: DD 7E FC
ld B, (ix+$06)                 ; 0159: DD 46 06
cp B                           ; 015C: B8
jp nc, __zax_if_else_3         ; 015D: D2 00 00
ex DE, HL                      ; 0160: EB
ld E, (IX + $0004)             ; 0161: DD 5E 04
ex DE, HL                      ; 0164: EB
ld A, (ix+$06)                 ; 0165: DD 7E 06
push DE                        ; 0168: D5
push HL                        ; 0169: E5
ld de, values                  ; 016A: 11 00 00
ld H, $0000                    ; 016D: 26 00
ld L, L                        ; 016F: 6D
add HL, DE                     ; 0170: 19
ld (HL), A                     ; 0171: 77
pop HL                         ; 0172: E1
pop DE                         ; 0173: D1
jp __zax_epilogue_0            ; 0174: C3 00 00
__zax_if_else_3:
jp nz, __zax_if_else_5         ; 0177: C2 00 00
ex DE, HL                      ; 017A: EB
ld E, (IX + $0004)             ; 017B: DD 5E 04
ex DE, HL                      ; 017E: EB
ld A, (ix+$06)                 ; 017F: DD 7E 06
push DE                        ; 0182: D5
push HL                        ; 0183: E5
ld de, values                  ; 0184: 11 00 00
ld H, $0000                    ; 0187: 26 00
ld L, L                        ; 0189: 6D
add HL, DE                     ; 018A: 19
ld (HL), A                     ; 018B: 77
pop HL                         ; 018C: E1
pop DE                         ; 018D: D1
jp __zax_epilogue_0            ; 018E: C3 00 00
__zax_if_else_5:
ex DE, HL                      ; 0191: EB
ld E, (IX + $0004)             ; 0192: DD 5E 04
ex DE, HL                      ; 0195: EB
ld A, (ix-$04)                 ; 0196: DD 7E FC
push DE                        ; 0199: D5
push HL                        ; 019A: E5
ld de, values                  ; 019B: 11 00 00
ld H, $0000                    ; 019E: 26 00
ld L, L                        ; 01A0: 6D
add HL, DE                     ; 01A1: 19
ld (HL), A                     ; 01A2: 77
pop HL                         ; 01A3: E1
pop DE                         ; 01A4: D1
ld e, (ix+$06)                 ; 01A5: DD 5E 06
ld H, $0000                    ; 01A8: 26 00
ld L, E                        ; 01AA: 6B
push HL                        ; 01AB: E5
ld e, (ix-$02)                 ; 01AC: DD 5E FE
ld H, $0000                    ; 01AF: 26 00
ld L, E                        ; 01B1: 6B
push HL                        ; 01B2: E5
call insert_hole               ; 01B3: CD 00 00
inc SP                         ; 01B6: 33
inc SP                         ; 01B7: 33
inc SP                         ; 01B8: 33
inc SP                         ; 01B9: 33
__zax_epilogue_0:
pop HL                         ; 01BA: E1
pop DE                         ; 01BB: D1
pop BC                         ; 01BC: C1
pop AF                         ; 01BD: F1
ld SP, IX                      ; 01BE: DD F9
pop IX                         ; 01C0: DD E1
ret                            ; 01C2: C9
; func insert_hole end
; func insertion_sort begin
insertion_sort:
push IX                        ; 01C3: DD E5
ld IX, $0000                   ; 01C5: DD 21 00 00
add IX, SP                     ; 01C9: DD 39
push HL                        ; 01CB: E5
ld HL, $0001                   ; 01CC: 21 01 00
ex (SP), HL                    ; 01CF: E3
push HL                        ; 01D0: E5
ld HL, $0000                   ; 01D1: 21 00 00
ex (SP), HL                    ; 01D4: E3
push AF                        ; 01D5: F5
push BC                        ; 01D6: C5
push DE                        ; 01D7: D5
push HL                        ; 01D8: E5
ld A, $0001                    ; 01D9: 3E 01
or A                           ; 01DB: B7
__zax_while_cond_8:
jp z, __zax_while_end_9        ; 01DC: CA 00 00
ld A, (ix-$02)                 ; 01DF: DD 7E FE
cp ItemCount                   ; 01E2: FE 08
jp c, __zax_if_else_10         ; 01E4: DA 00 00
jp __zax_epilogue_7            ; 01E7: C3 00 00
__zax_if_else_10:
ex DE, HL                      ; 01EA: EB
ld E, (IX - $0002)             ; 01EB: DD 5E FE
ex DE, HL                      ; 01EE: EB
push DE                        ; 01EF: D5
push HL                        ; 01F0: E5
ld de, values                  ; 01F1: 11 00 00
ld H, $0000                    ; 01F4: 26 00
ld L, L                        ; 01F6: 6D
add HL, DE                     ; 01F7: 19
ld A, (HL)                     ; 01F8: 7E
pop HL                         ; 01F9: E1
pop DE                         ; 01FA: D1
ld (ix-$04), A                 ; 01FB: DD 77 FC
ld e, (ix-$04)                 ; 01FE: DD 5E FC
ld H, $0000                    ; 0201: 26 00
ld L, E                        ; 0203: 6B
push HL                        ; 0204: E5
ld e, (ix-$02)                 ; 0205: DD 5E FE
ld H, $0000                    ; 0208: 26 00
ld L, E                        ; 020A: 6B
push HL                        ; 020B: E5
call insert_hole               ; 020C: CD 00 00
inc SP                         ; 020F: 33
inc SP                         ; 0210: 33
inc SP                         ; 0211: 33
inc SP                         ; 0212: 33
push DE                        ; 0213: D5
ld E, (IX - $0002)             ; 0214: DD 5E FE
inc E                          ; 0217: 1C
ld (IX - $0002), E             ; 0218: DD 73 FE
pop DE                         ; 021B: D1
ld A, $0001                    ; 021C: 3E 01
or A                           ; 021E: B7
jp __zax_while_cond_8          ; 021F: C3 00 00
__zax_epilogue_7:
__zax_while_end_9:
pop HL                         ; 0222: E1
pop DE                         ; 0223: D1
pop BC                         ; 0224: C1
pop AF                         ; 0225: F1
ld SP, IX                      ; 0226: DD F9
pop IX                         ; 0228: DD E1
ret                            ; 022A: C9
; func insertion_sort end
; func main begin
main:
push IX                        ; 022B: DD E5
ld IX, $0000                   ; 022D: DD 21 00 00
add IX, SP                     ; 0231: DD 39
push AF                        ; 0233: F5
push BC                        ; 0234: C5
push DE                        ; 0235: D5
push HL                        ; 0236: E5
call insertion_sort            ; 0237: CD 00 00
__zax_epilogue_12:
pop HL                         ; 023A: E1
pop DE                         ; 023B: D1
pop BC                         ; 023C: C1
pop AF                         ; 023D: F1
ld SP, IX                      ; 023E: DD F9
pop IX                         ; 0240: DD E1
ret                            ; 0242: C9
; func main end

; symbols:
; label insert_hole = $0100
; label __zax_if_else_1 = $0131
; label __zax_if_else_3 = $0177
; label __zax_if_else_5 = $0191
; label __zax_epilogue_0 = $01BA
; label insertion_sort = $01C3
; label __zax_while_cond_8 = $01DC
; label __zax_if_else_10 = $01EA
; label __zax_epilogue_7 = $0222
; label __zax_while_end_9 = $0222
; label main = $022B
; label __zax_epilogue_12 = $023A
; data values = $8000
; label __zax_startup = $8008
; constant ItemCount = $0008 (8)
