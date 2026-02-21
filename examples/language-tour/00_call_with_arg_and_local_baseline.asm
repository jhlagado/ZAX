; ZAX lowered .asm trace
; range: $0100..$0160 (end exclusive)

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
ld E, (IX + $0004)             ; 0113: DD 5E 04
ld D, (IX + $0005)             ; 0116: DD 56 05
inc DE                         ; 0119: 13
ld (IX - $0002), E             ; 011A: DD 73 FE
ld (IX - $0001), D             ; 011D: DD 72 FF
ld E, (IX - $0002)             ; 0120: DD 5E FE
ld D, (IX - $0001)             ; 0123: DD 56 FF
ex DE, HL                      ; 0126: EB
__zax_epilogue_0:
pop DE                         ; 0127: D1
pop BC                         ; 0128: C1
pop AF                         ; 0129: F1
ld SP, IX                      ; 012A: DD F9
pop IX                         ; 012C: DD E1
ret                            ; 012E: C9
; func inc_one end
; func main begin
main:
push IX                        ; 012F: DD E5
ld IX, $0000                   ; 0131: DD 21 00 00
add IX, SP                     ; 0135: DD 39
push HL                        ; 0137: E5
ld HL, $0011                   ; 0138: 21 11 00
ex (SP), HL                    ; 013B: E3
ld HL, $0055                   ; 013C: 21 55 00
ex (SP), HL                    ; 013F: E3
push AF                        ; 0140: F5
push BC                        ; 0141: C5
push DE                        ; 0142: D5
push HL                        ; 0143: E5
ld HL, $0044                   ; 0144: 21 44 00
push HL                        ; 0147: E5
call inc_one                   ; 0148: CD 00 00
inc SP                         ; 014B: 33
inc SP                         ; 014C: 33
push DE                        ; 014D: D5
ex DE, HL                      ; 014E: EB
ld (IX - $0002), E             ; 014F: DD 73 FE
ld (IX - $0001), D             ; 0152: DD 72 FF
ex DE, HL                      ; 0155: EB
pop DE                         ; 0156: D1
__zax_epilogue_1:
pop HL                         ; 0157: E1
pop DE                         ; 0158: D1
pop BC                         ; 0159: C1
pop AF                         ; 015A: F1
ld SP, IX                      ; 015B: DD F9
pop IX                         ; 015D: DD E1
ret                            ; 015F: C9
; func main end

; symbols:
; label inc_one = $0100
; label __zax_epilogue_0 = $0127
; label main = $012F
; label __zax_epilogue_1 = $0157
