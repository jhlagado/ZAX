; ZAX lowered .asm trace
; range: $0100..$0190 (end exclusive)

; func inc_one begin
inc_one:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0022                   ; 0108: 21 22 00
push HL                        ; 010B: E5
ld HL, $0033                   ; 010C: 21 33 00
push HL                        ; 010F: E5
push AF                        ; 0110: F5
push BC                        ; 0111: C5
push DE                        ; 0112: D5
push AF                        ; 0113: F5
push BC                        ; 0114: C5
push DE                        ; 0115: D5
push IX                        ; 0116: DD E5
pop HL                         ; 0118: E1
ld DE, $0004                   ; 0119: 11 04 00
add HL, DE                     ; 011C: 19
push HL                        ; 011D: E5
pop HL                         ; 011E: E1
pop DE                         ; 011F: D1
pop BC                         ; 0120: C1
pop AF                         ; 0121: F1
ld E, (HL)                     ; 0122: 5E
inc HL                         ; 0123: 23
ld D, (HL)                     ; 0124: 56
ld E, E                        ; 0125: 5B
ld D, D                        ; 0126: 52
inc DE                         ; 0127: 13
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
push IX                        ; 012B: DD E5
pop HL                         ; 012D: E1
ld DE, $FFFE                   ; 012E: 11 FE FF
add HL, DE                     ; 0131: 19
push HL                        ; 0132: E5
pop HL                         ; 0133: E1
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld (HL), E                     ; 0137: 73
inc HL                         ; 0138: 23
ld (HL), D                     ; 0139: 72
push AF                        ; 013A: F5
push BC                        ; 013B: C5
push DE                        ; 013C: D5
push IX                        ; 013D: DD E5
pop HL                         ; 013F: E1
ld DE, $FFFE                   ; 0140: 11 FE FF
add HL, DE                     ; 0143: 19
push HL                        ; 0144: E5
pop HL                         ; 0145: E1
pop DE                         ; 0146: D1
pop BC                         ; 0147: C1
pop AF                         ; 0148: F1
ld E, (HL)                     ; 0149: 5E
inc HL                         ; 014A: 23
ld D, (HL)                     ; 014B: 56
ld E, E                        ; 014C: 5B
ld D, D                        ; 014D: 52
ex DE, HL                      ; 014E: EB
__zax_epilogue_0:
pop DE                         ; 014F: D1
pop BC                         ; 0150: C1
pop AF                         ; 0151: F1
ld SP, IX                      ; 0152: DD F9
pop IX                         ; 0154: DD E1
ret                            ; 0156: C9
; func inc_one end
; func main begin
main:
push IX                        ; 0157: DD E5
ld IX, $0000                   ; 0159: DD 21 00 00
add IX, SP                     ; 015D: DD 39
push HL                        ; 015F: E5
ld HL, $0011                   ; 0160: 21 11 00
ex (SP), HL                    ; 0163: E3
push AF                        ; 0164: F5
push BC                        ; 0165: C5
push DE                        ; 0166: D5
push HL                        ; 0167: E5
ld HL, $0044                   ; 0168: 21 44 00
push HL                        ; 016B: E5
call inc_one                   ; 016C: CD 00 00
inc SP                         ; 016F: 33
inc SP                         ; 0170: 33
push DE                        ; 0171: D5
ex DE, HL                      ; 0172: EB
push AF                        ; 0173: F5
push BC                        ; 0174: C5
push DE                        ; 0175: D5
push IX                        ; 0176: DD E5
pop HL                         ; 0178: E1
ld DE, $FFFE                   ; 0179: 11 FE FF
add HL, DE                     ; 017C: 19
push HL                        ; 017D: E5
pop HL                         ; 017E: E1
pop DE                         ; 017F: D1
pop BC                         ; 0180: C1
pop AF                         ; 0181: F1
ld (HL), E                     ; 0182: 73
inc HL                         ; 0183: 23
ld (HL), D                     ; 0184: 72
ex DE, HL                      ; 0185: EB
pop DE                         ; 0186: D1
__zax_epilogue_1:
pop HL                         ; 0187: E1
pop DE                         ; 0188: D1
pop BC                         ; 0189: C1
pop AF                         ; 018A: F1
ld SP, IX                      ; 018B: DD F9
pop IX                         ; 018D: DD E1
ret                            ; 018F: C9
; func main end

; symbols:
; label inc_one = $0100
; label __zax_epilogue_0 = $014F
; label main = $0157
; label __zax_epilogue_1 = $0187
